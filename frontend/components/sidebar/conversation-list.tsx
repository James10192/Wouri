"use client"

import { MessageSquareIcon, TrashIcon } from "lucide-react"
import { useConversationStore } from "@/lib/conversation-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ConversationList() {
  const { conversations, currentConversationId, setCurrentConversation, deleteConversation } =
    useConversationStore()

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
    <div className="space-y-1 p-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "group relative flex items-center gap-2 rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer",
            currentConversationId === conv.id && "bg-accent"
          )}
          onClick={() => setCurrentConversation(conv.id)}
        >
          <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{conv.title}</p>
            <p className="text-xs text-muted-foreground">
              {conv.messageCount} messages • {new Date(conv.lastMessageAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              deleteConversation(conv.id)
            }}
          >
            <TrashIcon className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
