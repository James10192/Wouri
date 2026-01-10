import { Hono } from "hono";

const debug = new Hono();

// Stocker dernière recherche (production: utiliser Redis)
let lastVectorSearch: any = null;

export function setLastVectorSearch(data: any) {
  lastVectorSearch = data;
}

/**
 * GET /debug/last-search - Return last vector search for Tool visualization
 */
debug.get("/last-search", (c) => {
  if (!lastVectorSearch) {
    return c.json({ error: "No recent search" }, 404);
  }
  return c.json(lastVectorSearch);
});

export default debug;
