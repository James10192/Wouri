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
  const question = extractUserQuestion(body.messages)

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
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return new Response(errorText || "Backend error.", {
      status: response.status,
    })
  }

  const data = (await response.json()) as { answer?: string }
  const answer = data.answer || "Aucune reponse renvoyee par le backend."

  const stream = createUIMessageStream({
    originalMessages: body.messages,
    execute: ({ writer }) => {
      writer.write({ type: "start" })
      writer.write({ type: "start-step" })
      writer.write({ type: "text-start", id: "text-1" })
      writer.write({ type: "text-delta", id: "text-1", delta: answer })
      writer.write({ type: "text-end", id: "text-1" })
      writer.write({ type: "finish-step" })
      writer.write({ type: "finish" })
    },
  })

  return createUIMessageStreamResponse({ stream })
}
