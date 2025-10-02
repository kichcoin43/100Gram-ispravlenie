"use client"

import { useEffect, useState } from "react"
import { notificationService } from "@/lib/notifications"

export function useNotifications() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        await notificationService.initialize()
        setIsInitialized(true)

        const granted = await notificationService.requestPermissions()
        setHasPermission(granted)
      } catch (error) {
        console.error("[v0] Failed to initialize notifications:", error)
      }
    }

    init()
  }, [])

  const showNotification = async (title: string, body: string) => {
    if (isInitialized) {
      await notificationService.showLocalNotification(title, body)
    }
  }

  return {
    isInitialized,
    hasPermission,
    showNotification,
  }
}
