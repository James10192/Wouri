import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai"

export const maxDuration = 30

type ChatBody = {
  messages: UIMessage[]
  region?: string
  language?: string
  model?: string
  reasoningEnabled?: boolean
}

function extractUserQuestion(messages: UIMessage[]) {
  const lastUser = [...messages].reverse().find((message) => message.role === "user")
  if (!lastUser) return ""
  const textParts = lastUser.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
  return textParts.join(" ").trim()
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody
  const question = extractUserQuestion(body.messages || [])

  if (!question) {
    return new Response("Missing user question.", { status: 400 })
  }

  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"

  const response = await fetch(`${backendUrl}/test/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      region: body.region,
      language: body.language,
      model: body.model,
      reasoningEnabled: body.reasoningEnabled,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return new Response(errorText || "Backend error.", {
      status: response.status,
    })
  }

  const data = (await response.json()) as {
    answer?: string
    reasoning?: string
    usage?: {
      inputTokens: number
      outputTokens: number
      reasoningTokens?: number
    }
    debug?: {
      toolInvocations?: Array<{
        toolName: string
        args?: Record<string, unknown>
        result?: Record<string, unknown>
        errorText?: string
        state?: string
      }>
    }
  }
  const answer = data.answer || "Aucune reponse renvoyee par le backend."
  const reasoning = data.reasoning || ""
  const toolInvocations = data.debug?.toolInvocations || []

  const stream = createUIMessageStream({
    originalMessages: body.messages,
    execute: async ({ writer }) => {
      writer.write({ type: "start" })
      writer.write({ type: "start-step" })

      if (body.reasoningEnabled && reasoning) {
        writer.write({ type: "reasoning-start", id: "reasoning-1" })
        writer.write({
          type: "reasoning-delta",
          id: "reasoning-1",
          delta: reasoning,
        })
        writer.write({ type: "reasoning-end", id: "reasoning-1" })
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      writer.write({ type: "text-start", id: "text-1" })
      writer.write({ type: "text-delta", id: "text-1", delta: answer })
      writer.write({ type: "text-end", id: "text-1" })

      if (data.usage || toolInvocations.length > 0) {
        writer.write({
          type: "message-metadata",
          messageMetadata: {
            ...(data.usage ? { usage: data.usage } : {}),
            ...(toolInvocations.length > 0
              ? { toolInvocations }
              : {}),
          },
        })
      }

      writer.write({ type: "finish-step" })
      writer.write({ type: "finish" })
    },
  })

  return createUIMessageStreamResponse({ stream })
}
