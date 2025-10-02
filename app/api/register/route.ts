import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import bcrypt from "bcryptjs"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }

    if (username.length < 3 || password.length < 6) {
      return NextResponse.json({ error: "Username min 3 chars, password min 6 chars" }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await redis.get(`user:${username}`)
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Save user to Redis
    await redis.set(`user:${username}`, {
      username,
      password: hashedPassword,
      createdAt: Date.now(),
    })

    return NextResponse.json({ success: true, message: "User registered successfully" }, { status: 201 })
  } catch (error) {
    console.error("[v0] Register error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
