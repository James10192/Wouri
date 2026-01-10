"use client"

import { useState } from "react"
import { MessageSquareIcon, PlusIcon, SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ConversationList } from "./conversation-list"
import { useConversationStore } from "@/lib/conversation-store"

interface SidebarProps {
  onNewConversation: () => void
  currentModel: string
}

export function Sidebar({ onNewConversation, currentModel }: SidebarProps) {
  return (
    <aside className="hidden h-full w-72 border-r bg-muted/20 lg:flex">
      <Card className="m-4 flex h-[calc(100%-2rem)] w-full flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareIcon className="size-5" />
              Wouri Bot
            </CardTitle>
            <Button variant="ghost" size="icon" className="size-8">
              <SettingsIcon className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <ConversationList />
          </ScrollArea>
        </CardContent>
        <Separator />
        <CardFooter className="flex-col gap-2 pt-3">
          <Button className="w-full" onClick={onNewConversation}>
            <PlusIcon className="mr-2 size-4" />
            Nouvelle conversation
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Modèle actuel: {currentModel}
          </p>
        </CardFooter>
      </Card>
    </aside>
  )
}
