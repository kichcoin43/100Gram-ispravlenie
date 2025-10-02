import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { redis } from "@/lib/redis"

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

    const { username: currentUser } = payload
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Get all user keys
    const keys = await redis.keys("user:*")

    // Filter out non-user keys (like user:username:chats, user:username:unread)
    const userKeys = keys.filter((key) => {
      const parts = key.split(":")
      return parts.length === 2 && parts[0] === "user"
    })

    // Extract usernames and filter by query
    const usernames = userKeys
      .map((key) => key.replace("user:", ""))
      .filter((username) => username !== currentUser && username.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10) // Limit to 10 results

    return NextResponse.json({ users: usernames })
  } catch (error) {
    console.error("[v0] Search users error:", error)
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
  }
}
