import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { deleteMessage, redis, type Message } from "@/lib/redis"

export const runtime = "edge"

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
    const { messageId } = await request.json()

    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 })
    }

    // Get message to verify ownership
    const message = await redis.get<Message>(`message:${messageId}`)

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    if (message.author !== username) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 })
    }

    // Delete message
    const success = await deleteMessage(messageId)

    if (!success) {
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete message error:", error)
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
  }
}
