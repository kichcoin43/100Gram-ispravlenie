import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface User {
  username: string
  password: string
  createdAt: number
  displayName?: string
  bio?: string
  photoUrl?: string
}

export interface Chat {
  id: string
  participants: [string, string] // Always 2 users for 1-on-1 chat
  createdAt: number
  lastMessage?: {
    text: string
    author: string
    timestamp: number
  }
}

export interface Message {
  id: string
  chatId: string
  author: string
  text: string
  timestamp: number
  isRead: boolean
  isDeleted?: boolean
}

export interface Folder {
  id: string
  name: string
  username: string
  createdAt: number
}

// Helper to generate chat ID from two usernames (always sorted alphabetically)
export function getChatId(user1: string, user2: string): string {
  return [user1, user2].sort().join(":")
}

// Get or create a chat between two users
export async function getOrCreateChat(user1: string, user2: string): Promise<Chat> {
  const chatId = getChatId(user1, user2)

  let chat = await redis.get<Chat>(`chat:${chatId}`)

  if (!chat) {
    chat = {
      id: chatId,
      participants: [user1, user2].sort() as [string, string],
      createdAt: Date.now(),
    }
    await redis.set(`chat:${chatId}`, chat)

    // Add chat to both users' chat lists
    await redis.sadd(`user:${user1}:chats`, chatId)
    await redis.sadd(`user:${user2}:chats`, chatId)
  }

  return chat
}

// Get all chats for a user
export async function getUserChats(username: string): Promise<Chat[]> {
  const chatIds = await redis.smembers<string>(`user:${username}:chats`)

  if (!chatIds || chatIds.length === 0) {
    return []
  }

  const chats = await Promise.all(
    chatIds.map(async (chatId) => {
      const chat = await redis.get<Chat>(`chat:${chatId}`)
      return chat
    }),
  )

  return chats.filter((chat): chat is Chat => chat !== null)
}

export async function saveMessage(message: Message): Promise<void> {
  await redis.rpush(`chat:${message.chatId}:messages`, JSON.stringify(message))

  // Update chat's last message
  const chat = await redis.get<Chat>(`chat:${message.chatId}`)
  if (chat) {
    chat.lastMessage = {
      text: message.text,
      author: message.author,
      timestamp: message.timestamp,
    }
    await redis.set(`chat:${message.chatId}`, chat)
  }

  // Increment unread counter for recipient
  const recipient = chat?.participants.find((p) => p !== message.author)
  if (recipient) {
    await redis.hincrby(`user:${recipient}:unread`, message.chatId, 1)
  }
}

export async function getChatMessages(chatId: string, limit = 50): Promise<Message[]> {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const raw = await redis.lrange(`chat:${chatId}:messages`, 0, -1)
      console.log(`[v0] getChatMessages - attempt ${attempt + 1} - raw data from Redis:`, raw?.length || 0, "items")

      if (!raw || raw.length === 0) {
        console.log("[v0] getChatMessages - no messages found")
        return []
      }

      const messages = await Promise.all(
        raw.map(async (item) => {
          if (typeof item === "string") {
            // Check if it's a JSON string or just an ID
            if (item.startsWith("{")) {
              // It's a JSON string, parse it
              return JSON.parse(item) as Message
            } else {
              // It's a message ID, fetch the full message
              const message = await redis.get<Message>(`message:${item}`)
              return message
            }
          }
          return item as Message
        }),
      )

      // Filter out null messages and return last N messages
      const validMessages = messages.filter((msg): msg is Message => msg !== null)
      console.log("[v0] getChatMessages - parsed messages:", validMessages.length)
      return validMessages.slice(-limit)
    } catch (error) {
      lastError = error as Error
      console.error(`[v0] getChatMessages error on attempt ${attempt + 1}:`, error)

      // Wait before retrying (exponential backoff: 100ms, 200ms, 400ms)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)))
      }
    }
  }

  // If all retries failed, return empty array instead of crashing
  console.error("[v0] getChatMessages - all retries failed, returning empty array")
  return []
}

// Mark messages as read
export async function markMessagesAsRead(chatId: string, username: string): Promise<void> {
  try {
    console.log("[v0] markMessagesAsRead - chatId:", chatId, "username:", username)

    const unreadBefore = await redis.hget(`user:${username}:unread`, chatId)
    console.log("[v0] markMessagesAsRead - unread count before:", unreadBefore)

    // Reset unread counter for this chat
    await redis.hdel(`user:${username}:unread`, chatId)

    const unreadAfter = await redis.hget(`user:${username}:unread`, chatId)
    console.log("[v0] markMessagesAsRead - unread count after:", unreadAfter)
  } catch (error) {
    console.error("[v0] markMessagesAsRead error:", error)
  }
}

// Get unread counts for all chats
export async function getUnreadCounts(username: string): Promise<Record<string, number>> {
  const unreadData = await redis.hgetall<Record<string, number>>(`user:${username}:unread`)
  return unreadData || {}
}

// Delete a message
export async function deleteMessage(messageId: string): Promise<boolean> {
  const message = await redis.get<Message>(`message:${messageId}`)

  if (!message) {
    return false
  }

  message.isDeleted = true
  message.text = "Сообщение удалено"
  await redis.set(`message:${messageId}`, message)

  return true
}

// Search users by username
export async function searchUsers(query: string): Promise<string[]> {
  // In a real app, you'd use Redis search or a proper search index
  // For now, we'll use a simple pattern match
  const keys = await redis.keys(`user:${query}*`)
  return keys.map((key) => key.replace("user:", ""))
}

export async function updateUserProfile(
  username: string,
  updates: { displayName?: string; bio?: string; photoUrl?: string },
): Promise<User | null> {
  console.log("[v0] updateUserProfile - username:", username, "updates:", updates)

  const user = await redis.get<User>(`user:${username}`)
  console.log("[v0] updateUserProfile - existing user from Redis:", user)

  if (!user) {
    console.log("[v0] updateUserProfile - user not found in Redis")
    return null
  }

  const updatedUser = {
    ...user,
    ...updates,
  }
  console.log("[v0] updateUserProfile - saving updated user:", updatedUser)

  await redis.set(`user:${username}`, updatedUser)
  console.log("[v0] updateUserProfile - user saved successfully")

  return updatedUser
}

export async function getUserProfile(username: string): Promise<User | null> {
  console.log("[v0] getUserProfile - fetching user:", username)
  const user = await redis.get<User>(`user:${username}`)
  console.log("[v0] getUserProfile - result from Redis:", user)
  return user
}

// Create a folder
export async function createFolder(username: string, name: string): Promise<Folder> {
  const folderId = `${username}:${Date.now()}`
  const folder: Folder = {
    id: folderId,
    name,
    username,
    createdAt: Date.now(),
  }

  await redis.set(`folder:${folderId}`, folder)
  await redis.sadd(`user:${username}:folders`, folderId)

  return folder
}

// Get all folders for a user
export async function getUserFolders(username: string): Promise<Folder[]> {
  const folderIds = await redis.smembers<string>(`user:${username}:folders`)

  if (!folderIds || folderIds.length === 0) {
    return []
  }

  const folders = await Promise.all(
    folderIds.map(async (folderId) => {
      const folder = await redis.get<Folder>(`folder:${folderId}`)
      return folder
    }),
  )

  return folders.filter((folder): folder is Folder => folder !== null)
}

// Delete a folder
export async function deleteFolder(username: string, folderId: string): Promise<boolean> {
  const folder = await redis.get<Folder>(`folder:${folderId}`)

  if (!folder || folder.username !== username) {
    return false
  }

  await redis.del(`folder:${folderId}`)
  await redis.srem(`user:${username}:folders`, folderId)

  return true
}

// Add a chat to a folder
export async function addChatToFolder(username: string, folderId: string, chatId: string): Promise<boolean> {
  const folder = await redis.get<Folder>(`folder:${folderId}`)

  if (!folder || folder.username !== username) {
    return false
  }

  await redis.sadd(`folder:${folderId}:chats`, chatId)
  return true
}

// Remove a chat from a folder
export async function removeChatFromFolder(folderId: string, chatId: string): Promise<boolean> {
  await redis.srem(`folder:${folderId}:chats`, chatId)
  return true
}

// Get all chats in a folder
export async function getFolderChats(folderId: string): Promise<string[]> {
  const chatIds = await redis.smembers<string>(`folder:${folderId}:chats`)
  return chatIds || []
}

// Get which folder a chat belongs to (if any)
export async function getChatFolder(username: string, chatId: string): Promise<string | null> {
  const folderIds = await redis.smembers<string>(`user:${username}:folders`)

  if (!folderIds || folderIds.length === 0) {
    return null
  }

  for (const folderId of folderIds) {
    const chatIds = await redis.smembers<string>(`folder:${folderId}:chats`)
    if (chatIds && chatIds.includes(chatId)) {
      return folderId
    }
  }

  return null
}
