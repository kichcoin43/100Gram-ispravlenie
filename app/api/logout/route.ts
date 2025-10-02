import { NextResponse } from "next/server"

export const runtime = "edge"

export async function POST() {
  const response = NextResponse.json({ success: true })

  response.cookies.delete("auth-token")

  return response
}
