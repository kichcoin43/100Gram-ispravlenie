import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { markMessagesAsRead, getChatId } from "@/lib/redis"

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
    const { otherUser } = await request.json()

    if (!otherUser) {
      return NextResponse.json({ error: "Other user required" }, { status: 400 })
    }

    const chatId = getChatId(username, otherUser)
    await markMessagesAsRead(chatId, username)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Mark read error:", error)
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 })
  }
}
