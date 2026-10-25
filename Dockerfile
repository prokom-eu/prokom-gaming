# syntax=docker/dockerfile:1
# Production image (ADR-G001 §5): Next.js `standalone` + Payload, run as a non-root user.
# Built by .github/workflows/image.yml (G16); locally: docker build -t prokom-gaming:local .
# Node: same version as .nvmrc.

ARG NODE_IMAGE=node:24.22.0-bookworm-slim

# --- dependencies: full install (Tailwind and TypeScript from devDependencies are build tools) ---
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- build ---
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `lib/env` validates at import time; the build needs well-formed placeholders, never real
# values (they would stay in the image). The real environment comes from compose at runtime.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    PAYLOAD_SECRET=build-time-placeholder-not-a-secret-000 \
    SMTP_HOST=127.0.0.1 SMTP_PORT=25 \
    MAIL_FROM_ADDRESS=build@example.invalid \
    pnpm build

# --- runtime: only the traced server, static files and public/ ---
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
# Port inside the container; the host / Nginx mapping is set in compose (G16).
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 MEDIA_DIR=/app/media
# Uploads live on a volume mounted here; created now so the volume belongs to `node`.
RUN mkdir -p /app/media && chown node:node /app/media
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
# Node's own fetch: the slim image has no curl. The first check starts Payload (and migrations).
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server.js"]
