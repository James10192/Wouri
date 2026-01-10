import { NextResponse } from "next/server"

/**
 * GET /api/models
 * Proxy to backend to fetch available Groq models
 */
export async function GET() {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4456"

    const response = await fetch(`${backendUrl}/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `Backend /models error: ${response.status} - ${errorText}`
      )
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Failed to fetch models:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch models from backend" },
      { status: 500 }
    )
  }
}
