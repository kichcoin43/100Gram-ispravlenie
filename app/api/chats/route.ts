import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getUserChats, getUnreadCounts } from "@/lib/redis"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { username } = payload

    // Get all chats for this user
    const chats = await getUserChats(username)

    // Get unread counts
    const unreadCounts = await getUnreadCounts(username)

    // Enrich chats with unread counts and other user info
    const enrichedChats = chats.map((chat) => {
      const otherUser = chat.participants.find((p) => p !== username)
      return {
        ...chat,
        otherUser,
        unreadCount: unreadCounts[chat.id] || 0,
      }
    })

    // Sort by last message timestamp (most recent first)
    enrichedChats.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.createdAt
      const bTime = b.lastMessage?.timestamp || b.createdAt
      return bTime - aTime
    })

    return NextResponse.json({ chats: enrichedChats })
  } catch (error) {
    console.error("[v0] Get chats error:", error)
    return NextResponse.json({ error: "Failed to get chats" }, { status: 500 })
  }
}
