/**
 * Admin Authentication Middleware
 * Validates API key for admin dashboard endpoints
 *
 * @module middleware/auth
 */

import { Context, Next } from "hono";
import { config } from "../lib/config";

/**
 * Admin API key authentication middleware
 * Validates x-admin-key header against ADMIN_API_KEY env variable
 *
 * @param c - Hono context
 * @param next - Next middleware
 * @returns HTTP 401/403 if unauthorized, otherwise continues to next middleware
 *
 * @example
 * ```typescript
 * import { adminAuthMiddleware } from "./auth";
 *
 * app.use("/admin/*", adminAuthMiddleware);
 * ```
 */
export async function adminAuthMiddleware(c: Context, next: Next) {
  const apiKey = c.req.header("x-admin-key");

  // Check if API key is provided
  if (!apiKey) {
    return c.json(
      {
        error: "Missing API key",
        message: "Include 'x-admin-key' header with your admin API key",
      },
      401
    );
  }

  // Validate API key (simple comparison for MVP)
  // Future: Implement JWT with role-based access control (RBAC)
  if (!config.ADMIN_API_KEY) {
    console.error("[Admin Auth] ADMIN_API_KEY not configured in environment");
    return c.json(
      {
        error: "Server configuration error",
        message: "Admin API not configured. Contact administrator.",
      },
      500
    );
  }

  if (apiKey !== config.ADMIN_API_KEY) {
    // Log failed authentication attempt for security audit
    console.warn(
      `[Admin Auth] Invalid API key attempt - IP: ${c.req.header("x-forwarded-for") || "unknown"} - Path: ${c.req.method} ${c.req.path}`
    );

    return c.json(
      {
        error: "Invalid API key",
        message: "The provided API key is not authorized",
      },
      403
    );
  }

  // Log successful access for audit trail
  const timestamp = new Date().toISOString();
  const method = c.req.method;
  const path = c.req.path;
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

  console.log(`[Admin API] ${timestamp} - ${method} ${path} - IP: ${ip} - Status: Authorized`);

  // Continue to next middleware/handler
  await next();
}

/**
 * Rate limiting middleware for admin API (future implementation)
 * Prevents abuse by limiting requests per IP/API key
 *
 * @param c - Hono context
 * @param next - Next middleware
 *
 * @todo Implement rate limiting (e.g., 100 requests per minute)
 * @todo Store rate limit counters in Redis or in-memory cache
 * @todo Return 429 Too Many Requests when limit exceeded
 */
export async function adminRateLimitMiddleware(c: Context, next: Next) {
  // TODO: Implement rate limiting
  // For now, just pass through
  await next();
}
