import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Photo upload started")

    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      console.log("[v0] No token found in Authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      console.log("[v0] Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", payload.username)

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error("[v0] Failed to parse FormData:", error)
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
    }

    const file = formData.get("photo")

    if (!file || !(file instanceof File)) {
      console.log("[v0] No valid file in formData, received:", typeof file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      console.log("[v0] Invalid file type:", file.type)
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.log("[v0] File too large:", file.size)
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    console.log("[v0] File received:", file.name, file.type, file.size)

    // This fixes the "e.getAll is not a function" error in Edge runtime
    const blob = await put(`profile-photos/${payload.username}-${Date.now()}.${file.name.split(".").pop()}`, file, {
      access: "public",
    })

    console.log("[v0] Photo uploaded successfully:", blob.url)

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Photo upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to upload photo", details: errorMessage }, { status: 500 })
  }
}
