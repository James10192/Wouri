import { streamText, type UIMessage, convertToModelMessages } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[] | Promise<UIMessage[]>
    model: string
    webSearch: boolean
  }
  const messages = await body.messages
  const { model, webSearch } = body

  const result = streamText({
    model: webSearch ? "perplexity/sonar" : model,
    messages: await convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
  })

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  })
}
