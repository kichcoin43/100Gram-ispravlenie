"use client"

import { User, Search, Folder, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface BottomNavigationProps {
  activeTab: "profile" | "search" | "folders" | "more"
  onTabChange: (tab: "profile" | "search" | "folders" | "more") => void
  unreadCount?: number
  userPhotoUrl?: string
}

export function BottomNavigation({ activeTab, onTabChange, unreadCount = 0, userPhotoUrl }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
        <button
          onClick={() => onTabChange("profile")}
          className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
            activeTab === "profile" ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <Avatar className="h-6 w-6">
            {userPhotoUrl && <AvatarImage src={userPhotoUrl || "/placeholder.svg"} />}
            <AvatarFallback className="bg-blue-500 text-xs text-white">
              <User className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] font-medium">Профиль</span>
        </button>

        <button
          onClick={() => onTabChange("search")}
          className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
            activeTab === "search" ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <Search className="h-6 w-6" />
          <span className="text-[10px] font-medium">Поиск</span>
        </button>

        <button
          onClick={() => onTabChange("folders")}
          className={`relative flex flex-col items-center gap-0.5 px-4 py-1 ${
            activeTab === "folders" ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <Folder className="h-6 w-6" />
          <span className="text-[10px] font-medium">Папки</span>
          {unreadCount > 0 && (
            <span className="absolute right-3 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange("more")}
          className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
            activeTab === "more" ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <Settings className="h-6 w-6" />
          <span className="text-[10px] font-medium">Еще</span>
        </button>
      </div>
    </div>
  )
}
