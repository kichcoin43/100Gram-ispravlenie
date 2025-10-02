import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { redis, getChatId } from "@/lib/redis"

// export const runtime = "edge"

export async function GET(request: NextRequest) {
  console.log("[v0] 🔵 Subscribe endpoint called")

  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const otherUser = searchParams.get("otherUser")

  console.log("[v0] Subscribe params - token exists:", !!token, "otherUser:", otherUser)

  if (!token || !otherUser) {
    console.log("[v0] ❌ Subscribe rejected: missing token or otherUser")
    return new Response("Unauthorized", { status: 401 })
  }

  let payload
  try {
    payload = await verifyToken(token)
    console.log("[v0] ✅ Token verified for user:", payload?.username)
  } catch (error) {
    console.error("[v0] ❌ SSE token verification error:", error)
    return new Response("Token verification failed", { status: 401 })
  }

  if (!payload) {
    console.log("[v0] ❌ Subscribe rejected: invalid token payload")
    return new Response("Unauthorized", { status: 401 })
  }

  const { username } = payload
  const chatId = getChatId(username, otherUser)

  console.log("[v0] 🟢 Starting SSE stream for", username, "↔️", otherUser, "chatId:", chatId)

  const encoder = new TextEncoder()
  let lastSeenTimestamp = 0
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      console.log("[v0] 📡 SSE stream controller started")

      try {
        controller.enqueue(encoder.encode(`: connected\n\n`))
        console.log("[v0] ✅ Sent initial connection message")
      } catch (error) {
        console.error("[v0] ❌ SSE initial message error:", error)
        isClosed = true
        return
      }

      try {
        const messageIds = await redis.lrange(`chat:${chatId}:messages`, 0, -1)
        console.log("[v0] 📋 Found", messageIds?.length || 0, "existing messages in chat")

        if (messageIds && messageIds.length > 0) {
          for (const messageId of messageIds) {
            const message = await redis.get(`message:${messageId}`)
            if (message) {
              const data = `data: ${JSON.stringify(message)}\n\n`
              controller.enqueue(encoder.encode(data))
              if (message.timestamp > lastSeenTimestamp) {
                lastSeenTimestamp = message.timestamp
              }
            }
          }
          console.log("[v0] ✅ Sent all existing messages, last timestamp:", lastSeenTimestamp)
        }
      } catch (error) {
        console.error("[v0] ❌ SSE error loading existing messages:", error)
      }

      console.log("[v0] 🔄 Starting polling loop (500ms interval)")

      const pollInterval = setInterval(async () => {
        if (isClosed) {
          console.log("[v0] ⏹️ Polling stopped: connection closed")
          clearInterval(pollInterval)
          return
        }

        try {
          const messageIds = await redis.lrange(`chat:${chatId}:messages`, 0, -1)

          if (messageIds && messageIds.length > 0) {
            const newMessages = []

            for (const messageId of messageIds) {
              const message = await redis.get(`message:${messageId}`)

              if (message && message.timestamp > lastSeenTimestamp) {
                newMessages.push(message)
              }
            }

            if (newMessages.length > 0) {
              console.log("[v0] 🆕 Found", newMessages.length, "new messages!")
              newMessages.sort((a, b) => a.timestamp - b.timestamp)

              for (const message of newMessages) {
                const data = `data: ${JSON.stringify(message)}\n\n`

                try {
                  controller.enqueue(encoder.encode(data))
                  console.log(
                    "[v0] ✅ Sent new message:",
                    message.id,
                    "from:",
                    message.author,
                    "timestamp:",
                    message.timestamp,
                  )

                  if (message.timestamp > lastSeenTimestamp) {
                    lastSeenTimestamp = message.timestamp
                  }
                } catch (enqueueError) {
                  console.error("[v0] ❌ SSE enqueue error:", enqueueError)
                  isClosed = true
                  clearInterval(pollInterval)
                  return
                }
              }
            }
          }
        } catch (error) {
          console.error("[v0] ❌ SSE poll error:", error)
        }
      }, 500)

      const keepAlive = setInterval(() => {
        if (isClosed) {
          clearInterval(keepAlive)
          return
        }

        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`))
        } catch (error) {
          console.error("[v0] ❌ SSE keepalive error:", error)
          isClosed = true
          clearInterval(keepAlive)
        }
      }, 15000)

      const cleanup = () => {
        if (!isClosed) {
          console.log("[v0] 🔴 SSE connection closing for", username, "↔️", otherUser)
          isClosed = true
          clearInterval(pollInterval)
          clearInterval(keepAlive)
          try {
            controller.close()
          } catch (error) {
            console.error("[v0] ❌ SSE controller close error:", error)
          }
        }
      }

      request.signal.addEventListener("abort", cleanup)
      setTimeout(cleanup, 10 * 60 * 1000)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
