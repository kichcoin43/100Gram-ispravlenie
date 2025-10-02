import { PushNotifications } from "@capacitor/push-notifications"
import { LocalNotifications } from "@capacitor/local-notifications"
import { Capacitor } from "@capacitor/core"

export interface NotificationService {
  initialize: () => Promise<void>
  requestPermissions: () => Promise<boolean>
  registerDevice: (token: string) => Promise<void>
  showLocalNotification: (title: string, body: string) => Promise<void>
}

class NotificationServiceImpl implements NotificationService {
  private isNative = Capacitor.isNativePlatform()

  async initialize(): Promise<void> {
    if (!this.isNative) {
      console.log("[v0] Not a native platform, skipping notification initialization")
      return
    }

    try {
      // Request permissions for local notifications
      await LocalNotifications.requestPermissions()

      // Create notification channel for Android
      if (Capacitor.getPlatform() === "android") {
        await LocalNotifications.createChannel({
          id: "messages",
          name: "Messages",
          description: "New message notifications",
          importance: 5, // Max importance for heads-up notifications
          sound: "notification.mp3",
          vibration: true,
        })
      }

      // Listen for push notification registration
      await PushNotifications.addListener("registration", (token) => {
        console.log("[v0] Push registration success, token:", token.value)
        this.registerDevice(token.value)
      })

      // Listen for push notification registration errors
      await PushNotifications.addListener("registrationError", (error) => {
        console.error("[v0] Push registration error:", error)
      })

      // Listen for push notifications received
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[v0] Push notification received:", notification)
        // Show local notification when app is in foreground
        this.showLocalNotification(notification.title || "New Message", notification.body || "")
      })

      // Listen for push notification actions
      await PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
        console.log("[v0] Push notification action performed:", notification)
      })

      console.log("[v0] Notification service initialized")
    } catch (error) {
      console.error("[v0] Failed to initialize notifications:", error)
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.isNative) {
      return false
    }

    try {
      const permResult = await PushNotifications.requestPermissions()
      if (permResult.receive === "granted") {
        await PushNotifications.register()
        return true
      }
      return false
    } catch (error) {
      console.error("[v0] Failed to request permissions:", error)
      return false
    }
  }

  async registerDevice(fcmToken: string): Promise<void> {
    try {
      const authToken = localStorage.getItem("auth-token")
      if (!authToken) {
        console.error("[v0] No auth token found")
        return
      }

      const response = await fetch("/api/notifications/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fcmToken }),
      })

      if (response.ok) {
        console.log("[v0] Device registered for push notifications")
      } else {
        console.error("[v0] Failed to register device:", await response.text())
      }
    } catch (error) {
      console.error("[v0] Failed to register device:", error)
    }
  }

  async showLocalNotification(title: string, body: string): Promise<void> {
    if (!this.isNative) {
      return
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            channelId: "messages",
            sound: "notification.mp3",
            smallIcon: "ic_stat_notification",
            largeIcon: "ic_launcher",
            extra: {
              timestamp: Date.now(),
            },
          },
        ],
      })
    } catch (error) {
      console.error("[v0] Failed to show local notification:", error)
    }
  }
}

export const notificationService = new NotificationServiceImpl()
