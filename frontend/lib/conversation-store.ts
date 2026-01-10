import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Conversation {
  id: string
  title: string
  model: string
  messageCount: number
  createdAt: number
  lastMessageAt: number
}

interface ConversationState {
  conversations: Conversation[]
  currentConversationId: string | null

  addConversation: (
    conversation: Omit<Conversation, "id" | "createdAt" | "lastMessageAt">
  ) => string
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  deleteConversation: (id: string) => void
  setCurrentConversation: (id: string | null) => void
  getCurrentConversation: () => Conversation | null
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,

      addConversation: (data) => {
        const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const newConv: Conversation = {
          ...data,
          id,
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
        }
        set((state) => ({
          conversations: [newConv, ...state.conversations].slice(0, 50), // Max 50
          currentConversationId: id,
        }))
        return id
      },

      updateConversation: (id, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates, lastMessageAt: Date.now() } : c
          ),
        }))
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id
              ? null
              : state.currentConversationId,
        }))
      },

      setCurrentConversation: (id) => set({ currentConversationId: id }),

      getCurrentConversation: () => {
        const { conversations, currentConversationId } = get()
        return (
          conversations.find((c) => c.id === currentConversationId) || null
        )
      },
    }),
    {
      name: "wouribot-conversations",
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
)
