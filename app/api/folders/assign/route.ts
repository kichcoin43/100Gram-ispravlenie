import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { addChatToFolder, removeChatFromFolder } from "@/lib/redis"

export async function POST(request: NextRequest) {
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

    const { folderId, chatId } = await request.json()

    if (!folderId || !chatId) {
      return NextResponse.json({ error: "Missing folderId or chatId" }, { status: 400 })
    }

    const success = await addChatToFolder(payload.username, folderId, chatId)

    if (!success) {
      return NextResponse.json({ error: "Failed to add chat to folder" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Assign chat to folder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId")
    const chatId = searchParams.get("chatId")

    if (!folderId || !chatId) {
      return NextResponse.json({ error: "Missing folderId or chatId" }, { status: 400 })
    }

    await removeChatFromFolder(folderId, chatId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove chat from folder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
