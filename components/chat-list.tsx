"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, FolderInput, X } from "lucide-react"
import Image from "next/image"

interface Chat {
  id: string
  otherUser: string
  lastMessage?: {
    text: string
    author: string
    timestamp: number
  }
  unreadCount: number
  displayName?: string
  photoUrl?: string
  folderId?: string | null
  emoji?: string
}

interface Folder {
  id: string
  name: string
  createdAt: number
}

interface ChatListProps {
  username: string
  onSelectChat: (chatId: string, otherUser: string) => void
  onLogout: () => void
  onUnreadCountChange?: (count: number) => void
}

export function ChatList({ username, onSelectChat, onLogout, onUnreadCountChange }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeFolder, setActiveFolder] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [assigningChat, setAssigningChat] = useState<Chat | null>(null)

  useEffect(() => {
    loadChats()
    loadFolders()

    const pollInterval = setInterval(() => {
      loadChats()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [])

  const loadChats = async () => {
    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch("/api/chats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const chatsArray = Array.isArray(data.chats) ? data.chats : []
        const chatsWithProfiles = await Promise.all(
          chatsArray.map(async (chat: Chat) => {
            try {
              const profileRes = await fetch(`/api/profile?username=${encodeURIComponent(chat.otherUser)}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
              if (profileRes.ok) {
                const profile = await profileRes.json()
                return {
                  ...chat,
                  displayName: profile.displayName,
                  photoUrl: profile.photoUrl,
                  emoji: profile.emoji,
                }
              }
            } catch (error) {
              console.error("[v0] Load profile error:", error)
            }
            return chat
          }),
        )
        setChats(chatsWithProfiles)

        const totalUnread = chatsWithProfiles.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
        if (onUnreadCountChange) {
          onUnreadCountChange(totalUnread)
        }
      }
    } catch (error) {
      console.error("[v0] Load chats error:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadFolders = async () => {
    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch("/api/folders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setFolders(Array.isArray(data.folders) ? data.folders : [])
      }
    } catch (error) {
      console.error("[v0] Load folders error:", error)
    }
  }

  const handleAssignToFolder = async (folderId: string) => {
    if (!assigningChat) return

    try {
      const token = localStorage.getItem("auth-token")

      // Remove from current folder if any
      if (assigningChat.folderId) {
        await fetch(`/api/folders/assign?folderId=${assigningChat.folderId}&chatId=${assigningChat.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }

      // Add to new folder
      const response = await fetch("/api/folders/assign", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId,
          chatId: assigningChat.id,
        }),
      })

      if (response.ok) {
        // Update local state
        setChats((prev) => prev.map((chat) => (chat.id === assigningChat.id ? { ...chat, folderId } : chat)))
        setAssigningChat(null)
      }
    } catch (error) {
      console.error("[v0] Assign to folder error:", error)
    }
  }

  const handleRemoveFromFolder = async () => {
    if (!assigningChat || !assigningChat.folderId) return

    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch(
        `/api/folders/assign?folderId=${assigningChat.folderId}&chatId=${assigningChat.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.ok) {
        setChats((prev) => prev.map((chat) => (chat.id === assigningChat.id ? { ...chat, folderId: null } : chat)))
        setAssigningChat(null)
      }
    } catch (error) {
      console.error("[v0] Remove from folder error:", error)
    }
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-indigo-500",
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (minutes < 1) {
      return "сейчас"
    } else if (hours < 1) {
      return `${minutes}м`
    } else if (hours < 24) {
      return `${hours}ч`
    } else {
      const days = Math.floor(hours / 24)
      return `${days}д`
    }
  }

  const filteredChats = chats.filter((chat) => {
    if (activeFolder === "all") return true
    return chat.folderId === activeFolder
  })

  const getFolderCount = (folderId: string) => {
    return chats.filter((chat) => chat.folderId === folderId).length
  }

  return (
    <div className="flex h-screen flex-col bg-white pb-16">
      <div className="border-b bg-white px-4 py-2.5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Чаты</h1>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
            {filteredChats.length}
          </div>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFolder("all")}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFolder === "all" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Все ({chats.length})
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeFolder === folder.id ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {folder.name} ({getFolderCount(folder.id)})
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="mt-2 text-sm text-gray-500">Загрузка...</p>
            </div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">
                {activeFolder === "all" ? "Нет чатов" : "Нет чатов в этой папке"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {activeFolder === "all" ? "Найдите пользователя через поиск" : "Добавьте чаты в эту папку"}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {filteredChats.map((chat) => (
              <div key={chat.id} className="relative group">
                <button
                  onClick={() => onSelectChat(chat.id, chat.otherUser)}
                  className="flex w-full items-start gap-3 border-b border-gray-100 px-4 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <Avatar className={`h-11 w-11 flex-shrink-0 ${getAvatarColor(chat.otherUser)}`}>
                    {chat.photoUrl && <AvatarImage src={chat.photoUrl || "/placeholder.svg"} />}
                    <AvatarFallback className="text-base font-semibold text-white">
                      {(chat.displayName || chat.otherUser)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <div className="flex w-full items-baseline justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-[15px] font-semibold text-gray-900">
                          {chat.displayName || chat.otherUser}
                        </h3>
                        {chat.otherUser === "KICH" && (
                          <Image
                            src="/verified-badge.png"
                            alt="Verified"
                            width={16}
                            height={16}
                            className="flex-shrink-0"
                          />
                        )}
                        {chat.emoji && (
                          <Image
                            src={`/emoji/${chat.emoji}.${chat.emoji === "drink" || chat.emoji === "party" || chat.emoji === "king" ? "jpeg" : "png"}`}
                            alt="Emoji"
                            width={24}
                            height={24}
                            className="flex-shrink-0"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {chat.lastMessage && (
                          <span className="flex-shrink-0 text-[13px] text-gray-400">
                            {formatTime(chat.lastMessage.timestamp)}
                          </span>
                        )}
                        {chat.unreadCount > 0 && (
                          <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5">
                            <span className="text-[11px] font-semibold text-white">
                              {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {chat.lastMessage && (
                      <p className="w-full truncate text-left text-[14px] text-gray-500">{chat.lastMessage.text}</p>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setAssigningChat(chat)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                  title="Добавить в папку"
                >
                  <FolderInput className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {assigningChat && (
        <div
          onClick={() => setAssigningChat(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Выберите папку</h2>
              <button onClick={() => setAssigningChat(null)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {folders.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">Папки пока не созданы</p>
                  <p className="mt-1 text-xs text-gray-400">Создайте папки для организации чатов</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assigningChat.folderId && (
                    <button
                      onClick={handleRemoveFromFolder}
                      className="flex w-full items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 hover:bg-red-100"
                    >
                      <X className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-red-700">Убрать из папки</span>
                    </button>
                  )}
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleAssignToFolder(folder.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 ${
                        assigningChat.folderId === folder.id ? "border-blue-500 bg-blue-50" : ""
                      }`}
                    >
                      <FolderInput className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{folder.name}</span>
                      {assigningChat.folderId === folder.id && (
                        <span className="ml-auto text-xs text-blue-600">Текущая</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
