"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { X, Camera, Save, Edit2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  onProfileUpdate?: () => void
}

interface UserProfile {
  username: string
  displayName?: string
  bio?: string
  photoUrl?: string
  emoji?: string
}

const EMOJI_OPTIONS = [
  { id: "cool", name: "Крутой", image: "/emoji/cool.png" },
  { id: "buy", name: "Предприниматель", image: "/emoji/buy.png" },
  { id: "verified-coin", name: "Монета", image: "/emoji/verified-coin.png" },
  { id: "treasure", name: "Сокровище", image: "/emoji/treasure.png" },
  { id: "coin-3d", name: "3D Монета", image: "/emoji/coin-3d.png" },
  { id: "spin", name: "Спин", image: "/emoji/spin.png" },
  { id: "nerd", name: "Умник", image: "/emoji/nerd.png" },
]

export function ProfileModal({ isOpen, onClose, username, onProfileUpdate }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [emoji, setEmoji] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchProfile()
    }
  }, [isOpen, username])

  const fetchProfile = async () => {
    try {
      console.log("[v0] ProfileModal - fetching profile for:", username)
      const token = localStorage.getItem("auth-token")
      const headers: HeadersInit = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(`/api/profile?username=${username}`, { headers })
      console.log("[v0] ProfileModal - API response status:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("[v0] ProfileModal - received profile data:", data)
        setProfile(data)
        setDisplayName(data.displayName || data.username)
        setBio(data.bio || "")
        setPhotoUrl(data.photoUrl || "")
        setEmoji(data.emoji || "")
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error("[v0] ProfileModal - API error:", errorData)
      }
    } catch (error) {
      console.error("[v0] ProfileModal - Failed to fetch profile:", error)
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Пожалуйста, выберите изображение (JPG, PNG, WebP или GIF)")
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setUploadError("Файл слишком большой. Максимальный размер: 5MB")
      return
    }

    console.log("[v0] Starting photo upload, file:", file.name)
    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append("photo", file)

      const token = localStorage.getItem("auth-token")
      if (!token) {
        console.error("[v0] No auth token found in localStorage")
        setUploadError("Ошибка авторизации. Пожалуйста, войдите снова.")
        return
      }

      console.log("[v0] Sending photo to API with auth token")
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      console.log("[v0] API response status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Photo uploaded successfully:", data.url)
        setPhotoUrl(data.url)
        setUploadError(null)
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] Upload failed:", errorData)
        setUploadError(errorData.error || "Не удалось загрузить фото")
      }
    } catch (error) {
      console.error("[v0] Failed to upload photo:", error)
      setUploadError("Ошибка сети. Проверьте подключение к интернету.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      console.log("[v0] ProfileModal - saving profile:", { displayName, bio, photoUrl, emoji })
      const token = localStorage.getItem("auth-token")
      if (!token) {
        console.error("[v0] No auth token found in localStorage")
        return
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName,
          bio,
          photoUrl,
          emoji,
        }),
      })

      console.log("[v0] ProfileModal - save response status:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("[v0] ProfileModal - profile saved successfully:", data)
        setIsEditMode(false)
        onProfileUpdate?.()
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error("[v0] ProfileModal - save error:", errorData)
      }
    } catch (error) {
      console.error("[v0] ProfileModal - Failed to save profile:", error)
    } finally {
      setIsSaving(false)
    }
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
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{isEditMode ? "Редактировать профиль" : "Мой профиль"}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isEditMode ? (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                {photoUrl ? (
                  <img src={photoUrl || "/placeholder.svg"} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                    {(displayName || username)[0].toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <h3 className="text-xl font-semibold">{displayName || username}</h3>
                {username === "KICH" && (
                  <Image src="/verified-badge.png" alt="Verified" width={16} height={16} className="flex-shrink-0" />
                )}
                {emoji && (
                  <Image
                    src={EMOJI_OPTIONS.find((e) => e.id === emoji)?.image || ""}
                    alt="Emoji"
                    width={28}
                    height={28}
                    className="flex-shrink-0"
                  />
                )}
              </div>
              <p className="text-sm text-gray-500">@{username}</p>
            </div>

            {bio && (
              <div className="mb-6">
                <h4 className="mb-2 text-sm font-medium text-gray-700">О себе</h4>
                <p className="text-sm text-gray-600">{bio}</p>
              </div>
            )}

            <Button onClick={() => setIsEditMode(true)} className="w-full">
              <Edit2 className="mr-2 h-4 w-4" />
              Редактировать профиль
            </Button>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">Измените свои личные данные</p>

            <div className="mb-6 flex flex-col items-center">
              <div className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                  {photoUrl ? (
                    <img src={photoUrl || "/placeholder.svg"} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                      {(displayName || username)[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={handlePhotoClick}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 rounded-full bg-blue-500 p-2 text-white shadow-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isUploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
              {uploadError && <p className="mt-2 text-center text-sm text-red-600">{uploadError}</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Имя</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ваше имя"
                    maxLength={50}
                    className="flex-1"
                  />
                  <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        title="Выбрать эмодзи"
                      >
                        {emoji ? (
                          <Image
                            src={EMOJI_OPTIONS.find((e) => e.id === emoji)?.image || ""}
                            alt="Emoji"
                            width={24}
                            height={24}
                            className="object-contain rounded-full"
                          />
                        ) : (
                          <Plus className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="end">
                      <div className="mb-2 text-sm font-medium text-gray-700">Выберите эмодзи</div>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => {
                            setEmoji("")
                            setIsEmojiPopoverOpen(false)
                          }}
                          className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all ${
                            emoji === "" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                          }`}
                          title="Без эмодзи"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                        {EMOJI_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setEmoji(option.id)
                              setIsEmojiPopoverOpen(false)
                            }}
                            className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all bg-white ${
                              emoji === option.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            title={option.name}
                          >
                            <Image
                              src={option.image || "/placeholder.svg"}
                              alt={option.name}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Имя пользователя</label>
                <Input value={username} disabled className="bg-gray-50" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">О себе</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Расскажите о себе"
                  maxLength={200}
                  rows={3}
                />
                <p className="mt-1 text-right text-xs text-gray-500">{bio.length}/200</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={() => setIsEditMode(false)} variant="outline" className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
