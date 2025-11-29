# Stage 1: Build and type check
FROM oven/bun:1.1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Type check
RUN bun run typecheck

# Stage 2: Production
FROM oven/bun:1.1-slim

WORKDIR /app

# Copy package files and install production deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Copy source (Bun runs TypeScript directly)
COPY --from=builder /app/src ./src

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun run -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
