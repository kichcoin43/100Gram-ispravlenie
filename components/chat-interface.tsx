"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNotifications } from "@/hooks/use-notifications"

interface Message {
  id: string
  username: string
  message: string
  timestamp: number
}

interface ChatInterfaceProps {
  username: string
  onLogout: () => void
}

export function ChatInterface({ username, onLogout }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const { showNotification } = useNotifications()

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth-token")
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

  // Load message history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/history", {
          headers: getAuthHeaders(),
        })

        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        } else if (response.status === 401) {
          onLogout()
        }
      } catch (error) {
        console.error("Failed to load history:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [onLogout])

  useEffect(() => {
    const token = localStorage.getItem("auth-token")
    if (!token) {
      onLogout()
      return
    }

    console.log("[v0] Connecting to global chat SSE")

    const eventSource = new EventSource(`/api/subscribe?token=${encodeURIComponent(token)}`)
    eventSourceRef.current = eventSource

    let reconnectAttempts = 0
    const maxReconnectAttempts = 5

    eventSource.onopen = () => {
      console.log("[v0] SSE connection opened")
      setIsConnected(true)
      reconnectAttempts = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data)
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === messageData.id)) {
            return prev
          }
          if (messageData.username !== username) {
            showNotification(messageData.username, messageData.message)
          }
          return [...prev, messageData]
        })
      } catch (error) {
        if (event.data && !event.data.startsWith(":")) {
          console.error("[v0] SSE parse error:", error)
        }
      }
    }

    eventSource.onerror = (error) => {
      console.error("[v0] SSE connection error", error)
      setIsConnected(false)

      if (eventSource.readyState === EventSource.CLOSED) {
        eventSource.close()

        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          console.log(`[v0] Reconnecting SSE (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
          setTimeout(() => {
            window.location.reload()
          }, 3000 * reconnectAttempts) // Exponential backoff
        } else {
          console.error("[v0] Max reconnection attempts reached, please refresh the page")
        }
      }
    }

    return () => {
      console.log("[v0] Closing SSE connection")
      eventSource.close()
    }
  }, [onLogout, username, showNotification])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: newMessage }),
      })

      if (response.ok) {
        setNewMessage("")
      } else if (response.status === 401) {
        onLogout()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Global Chat</h1>
            <p className="text-xs text-gray-500">
              @{username} •{" "}
              {isConnected ? (
                <span className="text-green-600">Connected</span>
              ) : (
                <span className="text-red-600">Disconnected</span>
              )}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </Button>
      </header>

      {/* Messages */}
      <div className="chat-scrollbar flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Be the first to say hello!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.username === username
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isOwn ? "bg-blue-500 text-white" : "bg-white text-gray-900 shadow-sm"
                  }`}
                >
                  {!isOwn && <div className="mb-1 text-xs font-semibold text-blue-600">{msg.username}</div>}
                  <div className="break-words text-sm leading-relaxed">{msg.message}</div>
                  <div className={`mt-1 text-xs ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t bg-white p-4 shadow-lg">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending || !isConnected}
            className="h-12 flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !newMessage.trim() || !isConnected}
            className="h-12 w-12"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </form>
    </div>
  )
}
