import type { MiddlewareHandler } from "hono";
import { config } from "@/lib/config";

export const requireAdminKey: MiddlewareHandler = async (c, next) => {
  const configuredKey = config.ADMIN_API_KEY;

  if (!configuredKey) {
    return c.json(
      {
        error: "Admin API not configured",
        message: "ADMIN_API_KEY is missing in environment variables.",
      },
      500
    );
  }

  const key = c.req.header("x-admin-key") || "";

  if (key !== configuredKey) {
    return c.json(
      {
        error: "Unauthorized",
        message: "Invalid admin API key.",
      },
      401
    );
  }

  await next();
};
