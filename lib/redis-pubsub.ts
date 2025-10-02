// Helper for Redis pub/sub operations
import { Redis } from "@upstash/redis"

export async function publishMessage(message: string) {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })

  await redis.publish("chat", message)
}

export async function getRecentMessages(count = 50) {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })

  const messages = await redis.lrange("messages", 0, count - 1)
  return messages
}
