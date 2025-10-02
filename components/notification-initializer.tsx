"use client"

import { useEffect } from "react"
import { useNotifications } from "@/hooks/use-notifications"

export function NotificationInitializer() {
  const { isInitialized, hasPermission } = useNotifications()

  useEffect(() => {
    if (isInitialized) {
      console.log("[v0] Notifications initialized, permission:", hasPermission)
    }
  }, [isInitialized, hasPermission])

  return null
}
