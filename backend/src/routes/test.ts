import { Hono } from "hono";
import { ragPipeline } from "@/lib/rag";
import type { RAGResponse } from "@/types";

const test = new Hono();

/**
 * GET /test/health - Vérifier que le serveur fonctionne
 */
test.get("/health", (c) => {
  return c.json({
    status: "ok",
    message: "Wouri Bot backend is running!",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /test/chat - Tester le RAG pipeline sans WhatsApp
 *
 * Body: {
 *   "question": "Quand planter le maïs?",
 *   "region": "Bouaké",
 *   "language": "fr"
 * }
 */
test.post("/chat", async (c) => {
  try {
    const body = await c.req.json();
    const {
      question,
      region = "Côte d'Ivoire",
      language = "fr",
      model,
      reasoningEnabled = false,
    } = body;

    if (!question) {
      return c.json({ error: "Question is required" }, 400);
    }

    console.log(`\n🌾 Testing RAG pipeline:`);
    console.log(`   Question: ${question}`);
    console.log(`   Region: ${region}`);
    console.log(`   Language: ${language}`);
    console.log(`   Model: ${model || "default"}`);
    console.log(`   Reasoning: ${reasoningEnabled}\n`);

    // Appeler le RAG pipeline
    const response: RAGResponse = await ragPipeline(
      question,
      region,
      language,
      model,
      reasoningEnabled,
    );

    return c.json({
      success: true,
      question,
      region,
      language,
      answer: response.answer,
      reasoning: response.reasoning,
      sources: response.sources,
      metadata: response.metadata,
      usage: {
        inputTokens: Math.floor((response.metadata?.tokens_used || 0) * 0.6),
        outputTokens: Math.floor((response.metadata?.tokens_used || 0) * 0.4),
        reasoningTokens: response.reasoning ? 50 : 0,
      },
    });
  } catch (error: any) {
    console.error("❌ Test chat error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      500
    );
  }
});

/**
 * GET /test/groq - Tester Groq API directement
 */
test.get("/groq", async (c) => {
  try {
    const { groq, GROQ_MODELS } = await import("@/services/groq");

    const response = await groq.chat.completions.create({
      model: GROQ_MODELS.LLAMA_70B,
      messages: [
        {
          role: "user",
          content: "Dis juste 'Bonjour! Je suis Wouri Bot, ton assistant agricole.' en 1 phrase.",
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const answer = response.choices[0]?.message?.content || "";

    return c.json({
      success: true,
      message: "Groq API works!",
      model: GROQ_MODELS.LLAMA_70B,
      answer,
      tokens_used: response.usage?.total_tokens || 0,
    });
  } catch (error: any) {
    console.error("❌ Groq test error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Groq API error",
      },
      500
    );
  }
});

/**
 * GET /test/supabase - Tester connexion Supabase
 */
test.get("/supabase", async (c) => {
  try {
    const { supabase } = await import("@/services/supabase");

    // Tester connexion simple
    const { data, error } = await supabase.from("users").select("count").limit(1);

    if (error) {
      return c.json(
        {
          success: false,
          error: error.message,
          hint: "Vérifiez SUPABASE_URL et SUPABASE_ANON_KEY dans .env",
        },
        500
      );
    }

    return c.json({
      success: true,
      message: "Supabase connection works!",
      database_accessible: true,
    });
  } catch (error: any) {
    console.error("❌ Supabase test error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Supabase connection error",
      },
      500
    );
  }
});

/**
 * GET /test/weather - Tester OpenWeatherMap API
 */
test.get("/weather", async (c) => {
  try {
    const region = c.req.query("region") || "Abidjan";
    const { config } = await import("@/lib/config");

    if (!config.OPENWEATHER_API_KEY) {
      return c.json({
        success: false,
        error: "OPENWEATHER_API_KEY not configured",
        hint: "Add your OpenWeatherMap API key to .env",
      });
    }

    // Appeler OpenWeatherMap API
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${region},CI&appid=${config.OPENWEATHER_API_KEY}&units=metric&lang=fr`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return c.json({
        success: false,
        error: data.message || "Weather API error",
      }, response.status);
    }

    return c.json({
      success: true,
      region,
      weather: {
        temperature: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        description: data.weather[0].description,
        wind_speed: data.wind.speed,
      },
    });
  } catch (error: any) {
    console.error("❌ Weather test error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Weather API error",
      },
      500
    );
  }
});

export default test;
