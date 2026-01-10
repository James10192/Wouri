"use client"

import { useState } from "react"
import { MessageSquareIcon, PlusIcon, SettingsIcon, ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ConversationList } from "./conversation-list"
import { useConversationStore } from "@/lib/conversation-store"
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector"

interface SidebarProps {
  onNewConversation: () => void
  currentModel: string
  availableModels: Array<{
    name: string
    value: string
    reasoningSupported: boolean
  }>
  model: string
  setModel: (model: string) => void
}

export function Sidebar({
  onNewConversation,
  currentModel,
  availableModels,
  model,
  setModel,
}: SidebarProps) {
  const [showModelSelector, setShowModelSelector] = useState(false)

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
          {/* Model Selector Button */}
          <Button
            variant="outline"
            className="w-full mt-3 justify-between"
            onClick={() => setShowModelSelector(true)}
          >
            <div className="flex items-center gap-2">
              <ModelSelectorLogo provider="groq" size={16} />
              <span className="text-sm truncate">{currentModel}</span>
            </div>
            <ChevronDownIcon className="size-4 opacity-50" />
          </Button>
        </CardHeader>
        <Separator />
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <ConversationList />
          </ScrollArea>
        </CardContent>
        <Separator />
        <CardFooter className="pt-3">
          <Button className="w-full" onClick={onNewConversation}>
            <PlusIcon className="mr-2 size-4" />
            Nouvelle conversation
          </Button>
        </CardFooter>
      </Card>

      {/* Model Selector Dialog */}
      <ModelSelector open={showModelSelector} onOpenChange={setShowModelSelector}>
        <ModelSelectorContent title="Sélectionner un modèle">
          <ModelSelectorInput placeholder="Rechercher un modèle..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>Aucun modèle trouvé</ModelSelectorEmpty>
            <ModelSelectorGroup heading="Modèles Groq">
              {availableModels.map((modelItem) => (
                <ModelSelectorItem
                  key={modelItem.value}
                  value={modelItem.value}
                  onSelect={() => {
                    setModel(modelItem.value)
                    setShowModelSelector(false)
                  }}
                >
                  <ModelSelectorLogo provider="groq" />
                  <ModelSelectorName>
                    {modelItem.name}
                    {modelItem.reasoningSupported && " ⚡"}
                  </ModelSelectorName>
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>
    </aside>
  )
}
