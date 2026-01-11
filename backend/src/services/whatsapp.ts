import { config } from "../lib/config";

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

/**
 * Check if WhatsApp is configured
 */
function isWhatsAppConfigured(): boolean {
  return !!(config.WHATSAPP_ACCESS_TOKEN && config.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Send text message via WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  to: string, // Phone number with country code (e.g., "+2250123456789")
  message: string,
): Promise<void> {
  // Guard: Check if WhatsApp is configured
  if (!config.WHATSAPP_ACCESS_TOKEN || !config.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn("⚠️ WhatsApp not configured - skipping message send");
    return;
  }

  const url = `${WHATSAPP_API_URL}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: message,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    console.log(`✅ Message sent to ${to}`);
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    throw error;
  }
}

/**
 * Send audio message via WhatsApp Business API
 */
export async function sendWhatsAppAudio(
  to: string,
  audioUrl: string, // Publicly accessible URL
): Promise<void> {
  if (!isWhatsAppConfigured()) {
    console.warn("⚠️ WhatsApp not configured - skipping audio send");
    return;
  }

  const url = `${WHATSAPP_API_URL}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "audio",
    audio: {
      link: audioUrl,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    console.log(`✅ Audio sent to ${to}`);
  } catch (error) {
    console.error("Failed to send WhatsApp audio:", error);
    throw error;
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  if (!isWhatsAppConfigured()) {
    console.warn("⚠️ WhatsApp not configured - skipping mark as read");
    return;
  }

  const url = `${WHATSAPP_API_URL}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Failed to mark message as read:", error);
    // Non-critical, don't throw
  }
}

/**
 * Verify webhook signature from Meta
 */
export function verifyWebhookSignature(
  signature: string,
  body: string,
): boolean {
  if (!signature) {
    return false;
  }

  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", config.WHATSAPP_APP_SECRET)
    .update(body)
    .digest("hex");

  const signatureHash = signature.replace("sha256=", "");

  return crypto.timingSafeEqual(
    Buffer.from(signatureHash),
    Buffer.from(expectedSignature),
  );
}
