/**
 * Admin API Client
 * For use in scripts and external tools
 */

// API_BASE_URL is REQUIRED - no fallback to prevent accidental wrong endpoint usage
const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.NEXT_PUBLIC_ADMIN_API_KEY;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined in environment variables. Set it to your backend URL (e.g., https://wouri-ashen.vercel.app)");
}

export class AdminApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    public details?: string
  ) {
    super(details || error);
    this.name = "AdminApiError";
  }
}

export async function adminFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!ADMIN_API_KEY) {
    throw new Error("ADMIN_API_KEY is not defined in environment variables");
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Unknown error",
      message: response.statusText,
    }));

    throw new AdminApiError(
      response.status,
      error.error || "API request failed",
      error.message
    );
  }

  return response.json();
}
