/**
 * Admin API Router
 * Mounts all admin dashboard endpoints with authentication
 *
 * @module routes/admin
 */

import { Hono } from "hono";
import { adminAuthMiddleware } from "@/middleware/auth";
import conversations from "./conversations";
import feedback from "./feedback";
import knowledge from "./knowledge";
import translations from "./translations";
import monitoring from "./monitoring";

const admin = new Hono();

// Apply authentication middleware to ALL admin routes
admin.use("/*", adminAuthMiddleware);

// Mount sub-routes
admin.route("/conversations", conversations);
admin.route("/feedback", feedback);
admin.route("/knowledge", knowledge);
admin.route("/translations", translations);
admin.route("/monitoring", monitoring);

// Admin API info endpoint
admin.get("/", (c) => {
  return c.json({
    name: "Wouri Bot Admin API",
    version: "1.0.0",
    endpoints: [
      { path: "/admin/conversations", methods: ["GET"] },
      { path: "/admin/conversations/:id", methods: ["GET"] },
      { path: "/admin/feedback", methods: ["GET", "POST"] },
      { path: "/admin/knowledge", methods: ["GET", "POST"] },
      { path: "/admin/translations", methods: ["GET", "POST"] },
      { path: "/admin/monitoring", methods: ["GET"] },
    ],
    documentation: "https://github.com/yourusername/wouribot/tree/main/docs/api",
  });
});

export default admin;
