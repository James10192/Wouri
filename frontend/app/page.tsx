"use client"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion"
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
} from "@/components/ai-elements/context"
import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { BrainIcon, CopyIcon, RefreshCcwIcon } from "lucide-react"
import { toast } from "sonner"
import { Sidebar } from "@/components/sidebar/sidebar"
import { useConversationStore } from "@/lib/conversation-store"

const fallbackModels = [
  {
    name: "Llama 3.3 70B Versatile",
    value: "llama-3.3-70b-versatile",
    reasoningSupported: false,
  },
  {
    name: "Llama 3.1 8B Instant",
    value: "llama-3.1-8b-instant",
    reasoningSupported: false,
  },
  {
    name: "Mixtral 8x7B",
    value: "mixtral-8x7b-32768",
    reasoningSupported: false,
  },
  {
    name: "Qwen 3 32B (Reasoning)",
    value: "qwen/qwen3-32b",
    reasoningSupported: true,
  },
]

const ChatBotDemo = () => {
  const [input, setInput] = useState("")
  const [availableModels, setAvailableModels] = useState(fallbackModels)
  const [model, setModel] = useState<string>(fallbackModels[0].value)
  const [modelByMessageId, setModelByMessageId] = useState<
    Record<string, string>
  >({})
  const [reasoningEnabled, setReasoningEnabled] = useState(false)
  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    regenerate,
    setMessages,
  } = useChat()
  const pendingModelRef = useRef(model)
  const { addConversation, updateConversation, getCurrentConversation } =
    useConversationStore()

  const selectedModelLabel =
    availableModels.find((modelItem) => modelItem.value === model)?.name ||
    "Choisir un modele"
  const reasoningAvailable =
    availableModels.find((modelItem) => modelItem.value === model)
      ?.reasoningSupported || false

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text)
    const hasAttachments = Boolean(message.files?.length)

    if (!(hasText || hasAttachments)) {
      return
    }

    // Create or update conversation
    const currentConv = getCurrentConversation()
    if (!currentConv) {
      const title = message.text?.slice(0, 50) || "Nouvelle conversation"
      addConversation({ title, model, messageCount: 1 })
    } else {
      updateConversation(currentConv.id, {
        messageCount: currentConv.messageCount + 1,
      })
    }

    pendingModelRef.current = model
    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          reasoningEnabled: reasoningEnabled,
        },
      }
    )
    setInput("")
  }

  const handleRetry = () => {
    const lastAssistant = [...messages]
      .reverse()
      .find((msg) => msg.role === "assistant")
    pendingModelRef.current = model
    if (lastAssistant) {
      setModelByMessageId((prev) => ({
        ...prev,
        [lastAssistant.id]: model,
      }))
    }
    regenerate({
      body: {
        model: model,
        reasoningEnabled: reasoningEnabled,
      },
    })
  }

  const handleNewConversation = () => {
    setMessages([])
    setModelByMessageId({})
  }

  // Load models from backend
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch("/api/models")
        if (!response.ok) {
          throw new Error(`Failed to load models: ${response.status}`)
        }
        const data = (await response.json()) as {
          models?: Array<{
            id: string
            active?: boolean
            reasoning_supported?: boolean
          }>
        }
        const modelsFromApi =
          data.models
            ?.filter((modelItem) => modelItem.active !== false)
            .map((modelItem) => ({
              name: modelItem.id,
              value: modelItem.id,
              reasoningSupported: Boolean(modelItem.reasoning_supported),
            })) || []
        if (modelsFromApi.length > 0) {
          setAvailableModels(modelsFromApi)
          setModel(modelsFromApi[0].value)
        }
      } catch (loadError) {
        console.error(loadError)
        toast.error("Impossible de charger la liste des modèles.", {
          description: "Le backend Groq est inaccessible.",
        })
      }
    }

    loadModels()
  }, [])

  // Disable reasoning if model doesn't support it
  useEffect(() => {
    if (!reasoningAvailable) {
      setReasoningEnabled(false)
    }
  }, [reasoningAvailable])

  // Track model per message
  useEffect(() => {
    const lastMessage = messages.at(-1)
    if (!lastMessage || lastMessage.role !== "assistant") {
      return
    }
    if (modelByMessageId[lastMessage.id]) {
      return
    }
    const usedModel = pendingModelRef.current
    if (!usedModel) {
      return
    }
    setModelByMessageId((prev) => ({
      ...prev,
      [lastMessage.id]: usedModel,
    }))
  }, [messages, modelByMessageId])

  // Error handling
  useEffect(() => {
    if (!error) return
    toast.error("Erreur lors de l'envoi du message.", {
      description: "Vérifie la connexion ou la configuration du backend.",
    })
    clearError()
  }, [error, clearError])

  // Calculate total tokens
  const totalTokensUsed = messages.reduce((sum, msg) => {
    const usage = (msg as any).usage || { inputTokens: 0, outputTokens: 0 }
    return sum + usage.inputTokens + usage.outputTokens
  }, 0)

  const modelMaxTokens: Record<string, number> = {
    "llama-3.3-70b-versatile": 8192,
    "mixtral-8x7b-32768": 32768,
    "qwen/qwen3-32b": 32768,
  }

  // Get suggestions based on last message
  function getRelatedSuggestions(message: any): string[] {
    if (message.role !== "assistant") return []

    const text =
      message.parts.find((p: any) => p.type === "text")?.text?.toLowerCase() ||
      ""

    if (text.includes("maïs") || text.includes("mais")) {
      return [
        "Quel engrais pour le maïs?",
        "Maladies du maïs et traitements",
        "Rendement moyen attendu",
      ]
    }
    if (text.includes("cacao")) {
      return [
        "Période de récolte optimale",
        "Traitement des cabosses",
        "Prix du cacao aujourd'hui",
      ]
    }
    if (text.includes("café") || text.includes("cafe")) {
      return [
        "Variétés de café en Côte d'Ivoire",
        "Taille des caféiers",
        "Séchage et fermentation",
      ]
    }

    return []
  }

  return (
    <div className="h-screen w-full">
      <div className="flex h-full w-full">
        <Sidebar onNewConversation={handleNewConversation} currentModel={selectedModelLabel} />

        <main className="flex h-full min-w-0 flex-1 flex-col p-4">
          <Conversation className="h-full w-full">
            <ConversationContent>
              {/* Initial suggestions */}
              {messages.length === 0 && (
                <div className="mb-4 px-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    💡 Questions rapides:
                  </p>
                  <Suggestions>
                    <Suggestion
                      suggestion="Quand planter le maïs à Bouaké?"
                      onClick={(text) => setInput(text)}
                    />
                    <Suggestion
                      suggestion="Maladies courantes du cacao en CI"
                      onClick={(text) => setInput(text)}
                    />
                    <Suggestion
                      suggestion="Météo agricole pour plantation"
                      onClick={(text) => setInput(text)}
                    />
                    <Suggestion
                      suggestion="Quel engrais pour le café?"
                      onClick={(text) => setInput(text)}
                    />
                  </Suggestions>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === "assistant" &&
                    message.parts.filter((part) => part.type === "source-url")
                      .length > 0 && (
                      <Sources>
                        <SourcesTrigger
                          count={
                            message.parts.filter(
                              (part) => part.type === "source-url"
                            ).length
                          }
                        />
                        {message.parts
                          .filter((part) => part.type === "source-url")
                          .map((part, i) => (
                            <SourcesContent key={`${message.id}-${i}`}>
                              <Source
                                key={`${message.id}-${i}`}
                                href={part.url}
                                title={part.url}
                              />
                            </SourcesContent>
                          ))}
                      </Sources>
                    )}
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <Message key={`${message.id}-${i}`} from={message.role}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                              {message.role === "assistant" && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Modele:{" "}
                                  {modelByMessageId[message.id] ||
                                    selectedModelLabel}
                                </div>
                              )}
                            </MessageContent>
                            {message.role === "assistant" &&
                              i === message.parts.length - 1 && (
                                <MessageActions>
                                  <MessageAction
                                    onClick={handleRetry}
                                    label="Retry"
                                  >
                                    <RefreshCcwIcon className="size-3" />
                                  </MessageAction>
                                  <MessageAction
                                    onClick={() =>
                                      navigator.clipboard.writeText(part.text)
                                    }
                                    label="Copy"
                                  >
                                    <CopyIcon className="size-3" />
                                  </MessageAction>
                                </MessageActions>
                              )}
                          </Message>
                        )
                      case "reasoning":
                        return (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={
                              status === "streaming" &&
                              message.id === messages.at(-1)?.id
                            }
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        )
                      default:
                        return null
                    }
                  })}
                </div>
              ))}

              {/* Loading shimmer */}
              {status === "submitted" && (
                <div className="space-y-2 px-4 py-2">
                  <Shimmer className="h-4 w-3/4" />
                  <Shimmer className="h-4 w-1/2" delay={100} />
                  <Shimmer className="h-4 w-2/3" delay={200} />
                </div>
              )}

              {/* Dynamic suggestions */}
              {messages.length > 0 &&
                getRelatedSuggestions(messages[messages.length - 1]).length >
                  0 && (
                  <Suggestions className="mb-4 px-4">
                    {getRelatedSuggestions(messages[messages.length - 1]).map(
                      (s) => (
                        <Suggestion key={s} suggestion={s} onClick={setInput} />
                      )
                    )}
                  </Suggestions>
                )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <PromptInput
            onSubmit={handleSubmit}
            className="mt-4"
            globalDrop
            multiple
          >
            <PromptInputHeader>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                {reasoningAvailable && (
                  <PromptInputButton
                    variant={reasoningEnabled ? "default" : "ghost"}
                    onClick={() => setReasoningEnabled(!reasoningEnabled)}
                    title="Afficher ou masquer le raisonnement"
                  >
                    <BrainIcon size={16} />
                    <span>Raisonnement</span>
                  </PromptInputButton>
                )}
                {/* Context component for token tracking */}
                <Context
                  usedTokens={totalTokensUsed}
                  maxTokens={modelMaxTokens[model] || 8192}
                  usage={(messages[messages.length - 1] as any)?.usage}
                  modelId={model}
                >
                  <ContextTrigger />
                  <ContextContent>
                    <ContextContentHeader />
                    <ContextContentBody>
                      <ContextInputUsage />
                      <ContextOutputUsage />
                      <ContextReasoningUsage />
                    </ContextContentBody>
                  </ContextContent>
                </Context>
              </PromptInputTools>
              <PromptInputSubmit disabled={!input && !status} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </main>
      </div>
    </div>
  )
}

export default function Home() {
  return <ChatBotDemo />
}
