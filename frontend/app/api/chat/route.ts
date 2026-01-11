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

function extractConversationHistory(messages: UIMessage[]) {
  if (messages.length === 0) return []
  const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf("user")
  const historySlice =
    lastUserIndex > 0 ? messages.slice(0, lastUserIndex) : []

  return historySlice
    .flatMap((message) =>
      message.parts
        .filter((part) => part.type === "text")
        .map((part) => ({
          role: message.role,
          content: part.text,
        }))
    )
    .slice(-6)
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody
  const question = extractUserQuestion(body.messages || [])
  const history = extractConversationHistory(body.messages || [])

  if (!question) {
    return new Response("Missing user question.", { status: 400 })
  }

  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"

  const response = await fetch(`${backendUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      region: body.region,
      language: body.language,
      model: body.model,
      reasoningEnabled: body.reasoningEnabled,
      history,
    }),
  })

  if (!response.ok || !response.body) {
    const errorText = await response.text()
    return new Response(errorText || "Backend error.", {
      status: response.status,
    })
  }

  const stream = createUIMessageStream({
    originalMessages: body.messages,
    execute: async ({ writer }) => {
      writer.write({ type: "start" })
      writer.write({ type: "start-step" })

      await streamFromBackend(response, body.reasoningEnabled, writer)

      writer.write({ type: "finish-step" })
      writer.write({ type: "finish" })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

async function streamFromBackend(
  response: Response,
  reasoningEnabled: boolean | undefined,
  writer: Awaited<ReturnType<typeof createUIMessageStream>>["writer"],
) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  const handleMessage = (payload: any) => {
    const answer = payload?.answer || "Aucune reponse renvoyee par le backend."
    const reasoning = payload?.reasoning || ""
    const toolInvocations = payload?.debug?.toolInvocations || []

    if (reasoningEnabled && reasoning) {
      writer.write({ type: "reasoning-start", id: "reasoning-1" })
      writer.write({
        type: "reasoning-delta",
        id: "reasoning-1",
        delta: reasoning,
      })
      writer.write({ type: "reasoning-end", id: "reasoning-1" })
    }

    writer.write({ type: "text-start", id: "text-1" })
    writer.write({ type: "text-delta", id: "text-1", delta: answer })
    writer.write({ type: "text-end", id: "text-1" })

    if (payload?.usage || toolInvocations.length > 0) {
      writer.write({
        type: "message-metadata",
        messageMetadata: {
          ...(payload?.usage ? { usage: payload.usage } : {}),
          ...(toolInvocations.length > 0 ? { toolInvocations } : {}),
        },
      })
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() || ""

    for (const part of parts) {
      const lines = part.split("\n").map((line) => line.trim())
      let event = "message"
      let dataLine = ""
      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.replace("event:", "").trim()
        } else if (line.startsWith("data:")) {
          dataLine = line.replace("data:", "").trim()
        }
      }

      if (!dataLine) {
        continue
      }

      try {
        const payload = JSON.parse(dataLine)
        if (event === "message") {
          handleMessage(payload)
        } else if (event === "error") {
          writer.write({ type: "text-start", id: "text-1" })
          writer.write({
            type: "text-delta",
            id: "text-1",
            delta: payload?.answer || "Une erreur est survenue.",
          })
          writer.write({ type: "text-end", id: "text-1" })
        }
      } catch {
        // Ignore malformed payloads
      }
    }
  }
}
