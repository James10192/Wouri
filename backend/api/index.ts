/**
 * Vercel Serverless Function Handler for Hono
 * This file adapts the Hono app to work with Vercel's serverless architecture
 */
import app from "../src/app";

export const config = {
  maxDuration: 60,
};

export default app;
