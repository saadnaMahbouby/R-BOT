
# ================= INSTALL BUN (SIMPLIFIED) ===================
ARG BUN_VERSION=1.3.14
FROM debian:bullseye-slim AS build-bun
ARG BUN_VERSION
RUN apt-get update -qq \
  && apt-get install -qq --no-install-recommends \
    ca-certificates curl unzip \
  && rm -rf /var/lib/apt/lists/* \
  && arch="$(dpkg --print-architecture)" \
  && case "${arch##*-}" in \
    amd64) build="x64-baseline";; \
    arm64) build="aarch64";; \
    *) echo "error: unsupported architecture: $arch"; exit 1 ;; \
  esac \
  && curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${build}.zip" -o bun.zip \
  && unzip bun.zip \
  && mv "bun-linux-${build}/bun" /usr/local/bin/bun \
  && chmod +x /usr/local/bin/bun \
  && rm -rf bun.zip "bun-linux-${build}" \
  && bun --version
# ================= BASE ===================
FROM node:22-bullseye-slim AS base
COPY --from=build-bun /usr/local/bin/bun /usr/local/bin/bun
RUN chmod +x /usr/local/bin/bun && bun --version
RUN apt-get -qy update \
  && apt-get -qy --no-install-recommends install \
    openssl ca-certificates git python3 g++ build-essential \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV CI=1
ENV HUSKY=0
ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
# ================= BUILDER ===================
FROM base AS builder
ARG SCOPE
ARG DATABASE_URL
ARG ENCRYPTION_SECRET
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_VIEWER_URL
# Fail-fast if missing
RUN test -n "$SCOPE" || (echo "SCOPE is required (builder/viewer)" && exit 1)
RUN test -n "$DATABASE_URL" || (echo "DATABASE_URL is required at build time" && exit 1)
RUN test -n "$ENCRYPTION_SECRET" || (echo "ENCRYPTION_SECRET is required at build time" && exit 1)
RUN test -n "$NEXTAUTH_URL" || (echo "NEXTAUTH_URL is required at build time" && exit 1)
RUN test -n "$NEXT_PUBLIC_VIEWER_URL" || (echo "NEXT_PUBLIC_VIEWER_URL is required at build time" && exit 1)
# Provide env to next build / prisma
ENV DATABASE_URL=${DATABASE_URL}
ENV ENCRYPTION_SECRET=${ENCRYPTION_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXT_PUBLIC_VIEWER_URL=${NEXT_PUBLIC_VIEWER_URL}
# Copy full repo (stable for Bun workspaces)
COPY . .
# If you customized this package, keep it
COPY packages/blocks/fileInput ./packages/blocks/fileInput
# Install dependencies without running postinstall
RUN SENTRYCLI_SKIP_DOWNLOAD=1 bun install --no-scripts
# Prisma generation explicitly
RUN bun x turbo run db:generate --filter=@typebot.io/prisma
# Build only the requested app + deps
RUN bun x turbo run build --filter=./apps/${SCOPE}...
# Ensure Next standalone exists
RUN test -d "apps/${SCOPE}/.next/standalone" \
  || (echo "Missing apps/${SCOPE}/.next/standalone (Next output must be standalone)" && exit 1)
# ================= RELEASE (OPTIMIZED) ===================
FROM node:22-bullseye-slim AS release
WORKDIR /app
ENV NODE_ENV=production
ENV CI=1
ENV HUSKY=0
ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
ARG SCOPE
ENV SCOPE=${SCOPE}
# ffmpeg: used to convert GIFs to MP4 for WhatsApp
RUN apt-get -qy update \
  && apt-get -qy --no-install-recommends install ffmpeg \
  && rm -rf /var/lib/apt/lists/*
# Create non-root user (recommended)
RUN groupadd -g 1001 nodejs \
  && useradd -m -u 1001 -g 1001 -s /bin/sh nextjs
# Copy standalone server (contains minimal node_modules)
COPY --from=builder /app/apps/${SCOPE}/.next/standalone ./
# Copy static + public assets
COPY --from=builder /app/apps/${SCOPE}/.next/static ./apps/${SCOPE}/.next/static
COPY --from=builder /app/apps/${SCOPE}/public ./apps/${SCOPE}/public
# Entrypoint
COPY scripts/${SCOPE}-entrypoint.sh ./
RUN chmod +x ./${SCOPE}-entrypoint.sh
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ./${SCOPE}-entrypoint.sh
