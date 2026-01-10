import { InlineCitation } from "@/components/ai-elements/inline-citation"

/**
 * Parse text with inline citations [Source: name, page X]
 * Returns React nodes with InlineCitation components
 */
export function parseTextWithCitations(text: string): React.ReactNode[] {
  const citationRegex = /\[Source: (.+?), page (\d+)\]/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let citationIndex = 0

  let match
  while ((match = citationRegex.exec(text)) !== null) {
    // Text before citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Citation component
    citationIndex++
    const sourceName = match[1]
    const pageNum = match[2]
    parts.push(
      <InlineCitation
        key={`cite-${citationIndex}`}
        href={`#source-${sourceName.replace(/\s/g, "-")}`}
        title={`${sourceName}, page ${pageNum}`}
      >
        [{citationIndex}]
      </InlineCitation>
    )

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}
