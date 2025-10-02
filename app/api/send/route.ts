import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { saveMessage, getOrCreateChat, type Message } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { username } = payload
    const { text, otherUser } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 })
    }

    if (!otherUser) {
      return NextResponse.json({ error: "Recipient required" }, { status: 400 })
    }

    // Get or create chat
    const chat = await getOrCreateChat(username, otherUser)

    // Create message
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chatId: chat.id,
      author: username,
      text: text.trim(),
      timestamp: Date.now(),
      isRead: false,
    }

    // Save message to Redis
    await saveMessage(message)

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("[v0] Send message error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
