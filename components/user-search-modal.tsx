"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"

interface UserSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (username: string) => void
}

interface UserProfile {
  username: string
  displayName?: string
  photoUrl?: string
}

export function UserSearchModal({ isOpen, onClose, onSelectUser }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const searchUsers = async () => {
    setSearching(true)
    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const usersWithProfiles = await Promise.all(
          data.users.map(async (username: string) => {
            try {
              const profileRes = await fetch(`/api/profile?username=${encodeURIComponent(username)}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
              if (profileRes.ok) {
                const profile = await profileRes.json()
                return {
                  username,
                  displayName: profile.displayName,
                  photoUrl: profile.photoUrl,
                }
              }
            } catch (error) {
              console.error("[v0] Load profile error:", error)
            }
            return { username }
          }),
        )
        setSearchResults(usersWithProfiles)
      }
    } catch (error) {
      console.error("Search users error:", error)
    } finally {
      setSearching(false)
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

  const handleSelectUser = (username: string) => {
    onSelectUser(username)
    setSearchQuery("")
    onClose()
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Поиск пользователей</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Введите логин для поиска..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto px-4 pb-4">
          {searching ? (
            <div className="py-8 text-center text-sm text-gray-500">Поиск...</div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((user) => (
                <button
                  key={user.username}
                  onClick={() => handleSelectUser(user.username)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-gray-50"
                >
                  <Avatar className={`h-10 w-10 ${getAvatarColor(user.username)}`}>
                    {user.photoUrl && <AvatarImage src={user.photoUrl || "/placeholder.svg"} />}
                    <AvatarFallback className="text-white">
                      {(user.displayName || user.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-900">{user.displayName || user.username}</span>
                    {user.username === "KICH" && (
                      <Image
                        src="/verified-badge.png"
                        alt="Verified"
                        width={20}
                        height={20}
                        className="flex-shrink-0"
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="py-8 text-center text-sm text-gray-500">Пользователи не найдены</div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">Введите логин для поиска</p>
              <p className="mt-1 text-xs text-gray-400">Найдите друзей по их логину</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
