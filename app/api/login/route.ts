import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import bcrypt from "bcryptjs"
import { createToken } from "@/lib/auth"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }

    // Get user from Redis
    const user = await redis.get<{
      username: string
      password: string
      createdAt: number
    }>(`user:${username}`)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = await createToken(username)

    return NextResponse.json({
      success: true,
      username,
      authenticated: true,
      token, // Send token to client
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
