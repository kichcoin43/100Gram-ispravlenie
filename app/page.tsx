"use client"

import { useState, useEffect } from "react"
import { AuthForm } from "@/components/auth-form"
import { ChatList } from "@/components/chat-list"
import { ChatWindow } from "@/components/chat-window"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ProfileModal } from "@/components/profile-modal"
import { SettingsModal } from "@/components/settings-modal"
import { UserSearchModal } from "@/components/user-search-modal"
import { FoldersModal } from "@/components/folders-modal"

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<{ chatId: string; otherUser: string } | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "search" | "folders" | "more">("profile")
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showFoldersModal, setShowFoldersModal] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [userPhotoUrl, setUserPhotoUrl] = useState<string>("")

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("auth-token")

      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.authenticated) {
            setAuthenticated(true)
            setUsername(data.username)
            loadUserProfile(data.username)
          }
        } else {
          localStorage.removeItem("auth-token")
        }
      } catch (error) {
        console.error("[v0] Auth check failed:", error)
        localStorage.removeItem("auth-token")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const loadUserProfile = async (username: string) => {
    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch(`/api/profile?username=${encodeURIComponent(username)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const profile = await response.json()
        setUserPhotoUrl(profile.photoUrl || "")
      }
    } catch (error) {
      console.error("[v0] Failed to load user profile:", error)
    }
  }

  const handleAuthSuccess = (loggedInUsername: string) => {
    setAuthenticated(true)
    setUsername(loggedInUsername)
    loadUserProfile(loggedInUsername)
  }

  const handleLogout = () => {
    localStorage.removeItem("auth-token")
    setAuthenticated(false)
    setUsername("")
    setSelectedChat(null)
    setUserPhotoUrl("")
  }

  const handleSelectChat = (chatId: string, otherUser: string) => {
    setSelectedChat({ chatId, otherUser })
  }

  const handleBack = () => {
    setSelectedChat(null)
  }

  const handleTabChange = (tab: "profile" | "search" | "folders" | "more") => {
    setActiveTab(tab)
    if (tab === "profile") {
      setShowProfileModal(true)
    } else if (tab === "search") {
      setShowSearchModal(true)
    } else if (tab === "folders") {
      setShowFoldersModal(true)
    } else if (tab === "more") {
      setShowSettingsModal(true)
    }
  }

  const handleProfileUpdate = () => {
    loadUserProfile(username)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return <AuthForm onSuccess={handleAuthSuccess} />
  }

  if (selectedChat) {
    return <ChatWindow username={username} otherUser={selectedChat.otherUser} onBack={handleBack} />
  }

  return (
    <>
      <ChatList
        username={username}
        onSelectChat={handleSelectChat}
        onLogout={handleLogout}
        onUnreadCountChange={setTotalUnread}
      />
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={totalUnread}
        userPhotoUrl={userPhotoUrl}
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        username={username}
        onProfileUpdate={handleProfileUpdate}
      />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      <UserSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectUser={(user) => handleSelectChat("", user)}
      />
      <FoldersModal isOpen={showFoldersModal} onClose={() => setShowFoldersModal(false)} />
    </>
  )
}
