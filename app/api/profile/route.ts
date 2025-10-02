import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getUserProfile, updateUserProfile } from "@/lib/redis"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")
    console.log("[v0] Profile GET - token exists:", !!token)

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    console.log("[v0] Profile GET - token payload:", payload)

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const username = request.nextUrl.searchParams.get("username") || payload.username
    console.log("[v0] Profile GET - fetching profile for username:", username)

    const user = await getUserProfile(username)
    console.log("[v0] Profile GET - user data from Redis:", user)

    if (!user) {
      console.log("[v0] Profile GET - user not found in Redis")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Don't send password
    const { password, ...userProfile } = user
    console.log("[v0] Profile GET - returning profile:", userProfile)

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("[v0] Profile fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")
    console.log("[v0] Profile PUT - token exists:", !!token)

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    console.log("[v0] Profile PUT - token payload:", payload)

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Profile PUT - update data:", body)

    const { displayName, bio, photoUrl, emoji } = body

    const updatedUser = await updateUserProfile(payload.username, {
      displayName,
      bio,
      photoUrl,
      emoji,
    })
    console.log("[v0] Profile PUT - updated user:", updatedUser)

    if (!updatedUser) {
      console.log("[v0] Profile PUT - user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { password, ...userProfile } = updatedUser
    console.log("[v0] Profile PUT - returning updated profile:", userProfile)

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("[v0] Profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
