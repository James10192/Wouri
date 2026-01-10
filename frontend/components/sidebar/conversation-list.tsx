"use client"

import { MessageSquareIcon, PencilIcon, TrashIcon } from "lucide-react"
import { useConversationStore } from "@/lib/conversation-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export function ConversationList() {
  const {
    conversations,
    currentConversationId,
    setCurrentConversation,
    deleteConversation,
    updateConversation,
  } =
    useConversationStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  useEffect(() => {
    if (!editingId) return
    const current = conversations.find((conv) => conv.id === editingId)
    if (current) {
      setEditingTitle(current.title)
    }
  }, [editingId, conversations])

  const startEditing = (id: string, title: string) => {
    setEditingId(id)
    setEditingTitle(title)
  }

  const commitEditing = () => {
    if (!editingId) return
    const trimmed = editingTitle.trim()
    if (trimmed) {
      updateConversation(editingId, { title: trimmed })
    }
    setEditingId(null)
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-8">
        <p className="text-center text-sm text-muted-foreground">
          Aucune conversation.
          <br />
          Commencez en posant une question!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "group relative flex items-start gap-3 rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer",
            currentConversationId === conv.id && "bg-accent"
          )}
          onClick={() => setCurrentConversation(conv.id)}
        >
          <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0 space-y-1">
            {editingId === conv.id ? (
              <input
                autoFocus
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={commitEditing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    commitEditing()
                  }
                  if (e.key === "Escape") {
                    e.preventDefault()
                    setEditingId(null)
                  }
                }}
                className="w-full rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm font-medium leading-snug line-clamp-2">
                {conv.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {conv.messageCount} messages •{" "}
              {new Date(conv.lastMessageAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation()
                startEditing(conv.id, conv.title)
              }}
            >
              <PencilIcon className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation()
                deleteConversation(conv.id)
              }}
            >
              <TrashIcon className="size-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
