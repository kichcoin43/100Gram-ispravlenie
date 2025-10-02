"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Folder, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FoldersModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FolderItem {
  id: string
  name: string
  createdAt: number
}

export function FoldersModal({ isOpen, onClose }: FoldersModalProps) {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFolders()
    }
  }, [isOpen])

  const loadFolders = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("auth-token")
      console.log("[v0] Loading folders with token:", !!token)
      const res = await fetch("/api/folders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log("[v0] Folders response status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Folders loaded:", data.folders)
        setFolders(Array.isArray(data.folders) ? data.folders : [])
      } else {
        const errorText = await res.text()
        console.error("[v0] Load folders error:", errorText)
      }
    } catch (error) {
      console.error("[v0] Failed to load folders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    console.log("[v0] Creating folder:", newFolderName)
    try {
      const token = localStorage.getItem("auth-token")
      console.log("[v0] Token exists:", !!token)
      console.log("[v0] Token value:", token?.substring(0, 20) + "...")

      const res = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newFolderName }),
      })

      console.log("[v0] Create folder response status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Folder created:", data.folder)
        setFolders([...folders, data.folder])
        setNewFolderName("")
        setIsCreating(false)
      } else {
        const errorText = await res.text()
        console.error("[v0] Create folder error:", errorText)
        try {
          const errorJson = JSON.parse(errorText)
          console.error("[v0] Create folder error JSON:", errorJson)
        } catch {
          console.error("[v0] Create folder error (raw):", errorText)
        }
      }
    } catch (error) {
      console.error("[v0] Failed to create folder:", error)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const token = localStorage.getItem("auth-token")
      const res = await fetch(`/api/folders?id=${folderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        setFolders(folders.filter((f) => f.id !== folderId))
      }
    } catch (error) {
      console.error("[v0] Failed to delete folder:", error)
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
      <div className="w-full max-w-md rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Папки</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : folders.length === 0 && !isCreating ? (
            <div className="py-8 text-center">
              <Folder className="mx-auto h-16 w-16 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Папки пока не созданы</p>
              <p className="mt-1 text-xs text-gray-400">Создайте папки для организации чатов</p>
            </div>
          ) : (
            <div className="space-y-2">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="rounded-full p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isCreating && (
            <div className="mt-4 space-y-3 rounded-lg border p-3">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Название папки"
                maxLength={30}
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={handleCreateFolder} className="flex-1" disabled={!newFolderName.trim()}>
                  Создать
                </Button>
                <Button
                  onClick={() => {
                    setIsCreating(false)
                    setNewFolderName("")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isCreating && (
          <div className="border-t p-4">
            <Button onClick={() => setIsCreating(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Создать папку
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
