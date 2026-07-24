# ──────────────────────────────────────────────────────────────
# VPL System — Dockerfile
# A Next.js Virtual Programming Lab with multi-language execution
# ──────────────────────────────────────────────────────────────

FROM node:20-bookworm

# ── Install language runtimes for code execution ──────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    default-jdk-headless \
    gcc \
    g++ \
    golang \
    rustc \
    cargo \
    sqlite3 \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN echo "=== Installed Runtimes ===" && \
    python3 --version && \
    java --version && \
    gcc --version | head -1 && \
    g++ --version | head -1 && \
    go version && \
    rustc --version && \
    sqlite3 --version && \
    node --version && \
    npm --version

# ── Set up the application ────────────────────────────────────
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=file:./dev.db

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install all dependencies (devDeps needed for prisma, tsx, build)
RUN npm ci --ignore-scripts
# Run postinstall (prisma generate) separately for clearer build logs
RUN npx prisma generate

# Copy Prisma schema and config before full source (for migration reference)
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Copy the rest of the source code
COPY . .

# Build Next.js production app
RUN npm run build

# Copy and set entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
