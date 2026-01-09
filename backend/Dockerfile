# Wouri Bot Backend - Dockerfile (Bun + Hono)
# For deployment on Render.com or Railway.app

FROM oven/bun:1.1-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Copy source code
FROM base AS release
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Expose port (Render uses PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun fetch http://localhost:${PORT:-3000}/health || exit 1

# Run the app
USER bun
ENTRYPOINT ["bun", "run", "src/index.ts"]
