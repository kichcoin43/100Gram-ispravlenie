"use client"

import type React from "react"

import { Settings, LogOut } from "lucide-react"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const handleLogout = async () => {
    try {
      console.log("[v0] Logging out...")
      localStorage.removeItem("auth-token")

      await fetch("/api/logout", { method: "POST" })

      window.location.href = "/"
    } catch (error) {
      console.error("[v0] Logout error:", error)
      window.location.href = "/"
    }
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md rounded-t-2xl bg-white pb-6">
        <div className="mb-2 flex justify-center pt-3">
          <div className="h-1 w-12 rounded-full bg-gray-300" />
        </div>

        <div className="space-y-1 px-4 py-2">
          <button
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-gray-50"
          >
            <Settings className="h-5 w-5 text-gray-600" />
            <span className="text-base">Настройки</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-red-500 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-base">Выйти</span>
          </button>
        </div>
      </div>
    </div>
  )
}
