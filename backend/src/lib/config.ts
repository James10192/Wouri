import { envSchema, type Env } from "@/types";

/**
 * Load and validate environment variables
 * Throws error if validation fails (fail-fast at startup)
 */
export function loadConfig(): Env {
  try {
    const env = envSchema.parse(process.env);
    console.log("✅ Environment variables validated successfully");
    return env;
  } catch (error) {
    console.error("❌ Environment validation failed:");
    console.error(error);
    process.exit(1);
  }
}

// Singleton config instance
export const config = loadConfig();
