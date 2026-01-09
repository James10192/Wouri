import { Hono } from "hono";
import { config } from "@/lib/config";
import { verifyWebhookSignature, sendWhatsAppMessage, markMessageAsRead } from "@/services/whatsapp";
import { getUserByWaId, createUser, checkUserQuota, incrementUserQuota } from "@/services/supabase";
import { ragPipeline, getPaymentReminderMessage } from "@/lib/rag";
import { SubscriptionExpiredError } from "@/types";

const webhooks = new Hono();

/**
 * GET /webhooks/whatsapp - Verify webhook (Meta requirement)
 */
webhooks.get("/whatsapp", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (mode === "subscribe" && token === config.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return c.text(challenge || "");
  }

  return c.json({ error: "Verification failed" }, 403);
});

/**
 * POST /webhooks/whatsapp - Receive messages from WhatsApp
 */
webhooks.post("/whatsapp", async (c) => {
  // 1. Verify signature (security)
  const signature = c.req.header("x-hub-signature-256") || "";
  const body = await c.req.text();

  if (!verifyWebhookSignature(signature, body)) {
    console.error("❌ Invalid webhook signature");
    return c.json({ error: "Invalid signature" }, 401);
  }

  // 2. Parse payload
  let payload;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    console.error("❌ Invalid JSON payload");
    return c.json({ error: "Invalid JSON" }, 400);
  }

  // 3. Return 200 immediately (Meta requires < 5s response)
  c.executionCtx.waitUntil(processWebhookAsync(payload));

  return c.json({ status: "received" });
});

/**
 * Process webhook asynchronously (don't block response)
 */
async function processWebhookAsync(payload: any): Promise<void> {
  try {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages) {
      console.log("No messages in payload");
      return;
    }

    const message = value.messages[0];
    const from = message.from; // WhatsApp ID
    const messageId = message.id;
    const messageType = message.type; // text, audio, image

    // Extract message content
    let messageText = "";
    if (messageType === "text") {
      messageText = message.text?.body || "";
    } else if (messageType === "audio") {
      // TODO: Implement audio transcription (Google STT or Groq Whisper)
      messageText = "[Audio message - transcription not implemented]";
    } else if (messageType === "image") {
      // TODO: Implement image analysis (Gemini Vision)
      messageText = "[Image message - analysis not implemented]";
    }

    if (!messageText) {
      console.log("Empty message, ignoring");
      return;
    }

    console.log(`📩 Received from ${from}: ${messageText}`);

    // Mark as read
    await markMessageAsRead(messageId);

    // Get or create user
    let user = await getUserByWaId(from);
    if (!user) {
      const phoneNumber = value.contacts?.[0]?.wa_id || from;
      user = await createUser(from, `+${phoneNumber}`);
      console.log(`✅ Created new user: ${from}`);
    }

    // Check quota
    const hasQuota = await checkUserQuota(user);
    if (!hasQuota) {
      const paymentMessage = getPaymentReminderMessage(user.preferred_language);
      await sendWhatsAppMessage(`+${from}`, paymentMessage);
      throw new SubscriptionExpiredError(from);
    }

    // Increment quota
    await incrementUserQuota(from);

    // Process with RAG pipeline
    const response = await ragPipeline(
      messageText,
      user.region || "Côte d'Ivoire",
      user.preferred_language,
    );

    // Send response
    await sendWhatsAppMessage(`+${from}`, response.answer);

    console.log(`✅ Response sent to ${from} (${response.metadata.tokens_used} tokens, ${response.metadata.response_time_ms}ms)`);
  } catch (error) {
    console.error("❌ Error processing webhook:", error);

    if (error instanceof SubscriptionExpiredError) {
      // Already handled above
      return;
    }

    // Send generic error message
    // TODO: Extract phone number from payload
    // await sendWhatsAppMessage(phoneNumber, "Désolé, une erreur est survenue. Réessayez dans quelques instants.");
  }
}

/**
 * POST /webhooks/fedapay - Payment webhook from FedaPay
 */
webhooks.post("/fedapay", async (c) => {
  // TODO: Implement FedaPay webhook handling
  // 1. Verify signature
  // 2. Parse payload (transaction status)
  // 3. Update user subscription in database

  const body = await c.req.json();
  console.log("FedaPay webhook:", body);

  return c.json({ status: "received" });
});

export default webhooks;
