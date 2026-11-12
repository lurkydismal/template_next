# syntax=docker/dockerfile:1

FROM node:26-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Keep in sync with "packageManager" in package.json.
ARG PNPM_VERSION=12.18.0
RUN npm install --global --no-audit --no-fund "pnpm@${PNPM_VERSION}"

# Install all dependencies once from the committed lockfile. --frozen-lockfile fails the build
# if package.json and pnpm-lock.yaml disagree, and pnpm's release-age policy still applies.
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_GITHUB_LINK=""
# Placeholders only so Next.js can load server modules while building; they are not copied
# into the runtime image, which requires the real Compose-provided values.
ENV NEXT_PUBLIC_GITHUB_LINK=${NEXT_PUBLIC_GITHUB_LINK} \
    DB_HOST=127.0.0.1 \
    POSTGRES_USER=build-only \
    POSTGRES_PASSWORD=build-only-not-a-runtime-secret \
    POSTGRES_DB=build-only \
    BETTER_AUTH_URL=https://build.invalid \
    BETTER_AUTH_SECRET=build-only-secret-not-used-at-runtime-000000000000 \
    AUTH_DISABLE_SIGN_UP=true
RUN pnpm build

# Deliberately separate from the runtime image: it keeps drizzle-kit (a dev dependency) and
# only runs when explicitly requested (`--profile ops run --rm migrate`).
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml drizzle.config.ts ./
COPY src/db ./src/db
COPY drizzle ./drizzle
ENV NODE_ENV=production
USER node
CMD ["./node_modules/.bin/drizzle-kit", "migrate"]

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs \
    && mkdir -p /app/.next/cache \
    && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=45s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
