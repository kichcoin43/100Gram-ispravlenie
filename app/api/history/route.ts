import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getChatId, getChatMessages } from "@/lib/redis"

export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams
    const otherUser = searchParams.get("otherUser")

    if (!otherUser) {
      return NextResponse.json({ error: "Other user required" }, { status: 400 })
    }

    const chatId = getChatId(username, otherUser)

    const messages = await getChatMessages(chatId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[v0] History error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
