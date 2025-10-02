"use client"

import { useState, useEffect } from "react"
import { X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  onStartChat?: (username: string) => void
}

interface UserProfile {
  username: string
  displayName?: string
  bio?: string
  photoUrl?: string
  createdAt: number
  emoji?: string
}

export function UserProfileModal({ isOpen, onClose, username, onStartChat }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (isOpen && username) {
      fetchProfile()
    }
  }, [isOpen, username])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile?username=${username}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    }
  }

  const handleStartChat = () => {
    onStartChat?.(username)
    onClose()
  }

  if (!isOpen || !profile) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Профиль</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
            {profile.photoUrl ? (
              <img src={profile.photoUrl || "/placeholder.svg"} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                {(profile.displayName || profile.username)[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <h3 className="text-xl font-semibold">{profile.displayName || profile.username}</h3>
            {profile.username === "KICH" && (
              <Image src="/verified-badge.png" alt="Verified" width={16} height={16} className="flex-shrink-0" />
            )}
            {profile.emoji && (
              <Image
                src={`/emoji/${profile.emoji}.${profile.emoji === "drink" || profile.emoji === "party" || profile.emoji === "king" ? "jpeg" : "png"}`}
                alt="Emoji"
                width={28}
                height={28}
                className="flex-shrink-0"
              />
            )}
          </div>
          <p className="text-sm text-gray-500">@{profile.username}</p>
        </div>

        {profile.bio && (
          <div className="mb-6">
            <h4 className="mb-2 text-sm font-medium text-gray-700">О себе</h4>
            <p className="text-sm text-gray-600">{profile.bio}</p>
          </div>
        )}

        <Button onClick={handleStartChat} className="w-full">
          <MessageCircle className="mr-2 h-4 w-4" />
          Написать сообщение
        </Button>
      </div>
    </div>
  )
}
