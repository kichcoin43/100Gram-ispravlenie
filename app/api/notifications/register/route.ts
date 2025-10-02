import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { kv } from "@vercel/kv"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fcmToken } = await request.json()
    if (!fcmToken) {
      return NextResponse.json({ error: "FCM token is required" }, { status: 400 })
    }

    // Store FCM token for the user
    await kv.set(`fcm:${user.username}`, fcmToken)

    console.log(`[v0] Registered FCM token for user: ${user.username}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to register FCM token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
