"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowLeft, Send, MoreVertical, Trash2 } from "lucide-react"
import { UserProfileModal } from "@/components/user-profile-modal"
import Image from "next/image"
import type { Message } from "@/lib/redis"

interface ChatWindowProps {
  username: string
  otherUser: string
  onBack: () => void
}

interface UserProfile {
  username: string
  displayName?: string
  photoUrl?: string
}

export function ChatWindow({ username, otherUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [otherUserProfile, setOtherUserProfile] = useState<UserProfile | null>(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const seenMessageIds = useRef<Set<string>>(new Set())
  const lastCheckTimestamp = useRef<number>(0)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    console.log("[v0] ChatWindow mounted for user:", username, "chatting with:", otherUser)
    loadHistory()
    startPolling()
    loadOtherUserProfile()

    return () => {
      stopPolling()
    }
  }, [otherUser])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [loading])

  const loadOtherUserProfile = async () => {
    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch(`/api/profile?username=${encodeURIComponent(otherUser)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOtherUserProfile(data)
      }
    } catch (error) {
      console.error("[v0] Load user profile error:", error)
    }
  }

  const loadHistory = async () => {
    console.log("[v0] Loading chat history with:", otherUser)
    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch(`/api/history?otherUser=${encodeURIComponent(otherUser)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const historyMessages = Array.isArray(data.messages) ? data.messages : []
        console.log("[v0] Loaded", historyMessages.length, "messages from history")
        setMessages(historyMessages)
        historyMessages.forEach((msg: Message) => {
          seenMessageIds.current.add(msg.id)
          if (msg.timestamp > lastCheckTimestamp.current) {
            lastCheckTimestamp.current = msg.timestamp
          }
        })
      } else {
        console.error("[v0] Load history failed with status:", response.status)
        setMessages([])
      }
    } catch (error) {
      console.error("[v0] Load history error:", error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const startPolling = () => {
    pollingInterval.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("auth-token")
        const response = await fetch(`/api/history?otherUser=${encodeURIComponent(otherUser)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const historyMessages = Array.isArray(data.messages) ? data.messages : []

          // Only add new messages that we haven't seen
          historyMessages.forEach((msg: Message) => {
            if (!seenMessageIds.current.has(msg.id)) {
              seenMessageIds.current.add(msg.id)
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) {
                  return prev
                }
                return [...prev, msg]
              })

              // Mark as read if message is from other user
              if (msg.author !== username) {
                markAsRead()
              }
            }
          })
        }
      } catch (error) {
        console.error("[v0] Polling error:", error)
      }
    }, 5000) // Poll every 5 seconds instead of 2
  }

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current)
      pollingInterval.current = null
    }
  }

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem("auth-token")
      await fetch("/api/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otherUser }),
      })
    } catch (error) {
      console.error("[v0] Mark read error:", error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputText.trim() || sending) {
      return
    }

    console.log("[v0] Sending message to:", otherUser, "Text:", inputText)
    setSending(true)

    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: inputText,
          otherUser,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Message sent successfully:", data.message.id)
        seenMessageIds.current.add(data.message.id)
        if (data.message.timestamp > lastCheckTimestamp.current) {
          lastCheckTimestamp.current = data.message.timestamp
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) {
            return prev
          }
          return [...prev, data.message]
        })
        setInputText("")
      } else {
        console.error("[v0] Send message failed with status:", response.status)
      }
    } catch (error) {
      console.error("[v0] Send message error:", error)
    } finally {
      setSending(false)
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch("/api/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId }),
      })

      if (response.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isDeleted: true,
                  text: "Сообщение удалено",
                }
              : m,
          ),
        )
      }
    } catch (error) {
      console.error("[v0] Delete message error:", error)
    }
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-indigo-500",
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <button onClick={() => setShowUserProfile(true)} className="flex flex-1 items-center gap-3">
          <Avatar className={`h-10 w-10 ${getAvatarColor(otherUser)}`}>
            {otherUserProfile?.photoUrl && <AvatarImage src={otherUserProfile.photoUrl || "/placeholder.svg"} />}
            <AvatarFallback className="text-white">
              {(otherUserProfile?.displayName || otherUser)[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-1">
              <h2 className="font-semibold text-gray-900">{otherUserProfile?.displayName || otherUser}</h2>
              {otherUser === "KICH" && (
                <Image src="/verified-badge.png" alt="Verified" width={20} height={20} className="flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500">{isConnected ? "онлайн" : "подключение..."}</p>
          </div>
        </button>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="mt-2 text-sm text-gray-500">Загрузка...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-sm text-gray-500">Нет сообщений</p>
              <p className="mt-1 text-xs text-gray-400">Начните разговор</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isOwn = message.author === username
              return (
                <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`group max-w-[70%] ${isOwn ? "order-2" : "order-1"}`}>
                    <div className="flex items-start gap-2">
                      {isOwn && !message.isDeleted && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => deleteMessage(message.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-blue-500 text-white"
                            : message.isDeleted
                              ? "bg-gray-200 italic text-gray-500"
                              : "bg-white text-gray-900"
                        }`}
                      >
                        <p className="break-words text-sm">{message.text}</p>
                      </div>
                    </div>
                    <p className={`mt-1 text-xs text-gray-500 ${isOwn ? "text-right" : "text-left"}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="Написать сообщение..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={sending || !inputText.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        username={otherUser}
        onStartChat={(user) => {}}
      />
    </div>
  )
}
