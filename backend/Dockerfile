# syntax=docker/dockerfile:1

# ---------- Stage 1: build ----------
# Compiles TypeScript and generates the Prisma client.
FROM node:22-slim AS build
WORKDIR /app

# Prisma needs OpenSSL to build/run its query engine on Debian.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install all deps (including dev) using the lockfile for reproducibility.
COPY package*.json ./
RUN npm ci

# Generate the Prisma client (needs the schema), then compile the server.
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies so only production deps are copied to the runtime image.
# `prisma` and `@prisma/client` remain because they are runtime dependencies.
RUN npm prune --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy pruned deps (incl. generated Prisma client), compiled JS, schema + migrations.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run as the built-in non-root user.
USER node

# Informational; the platform injects the real PORT env var.
EXPOSE 5050

# The entrypoint applies pending migrations (unless RUN_MIGRATIONS=false), then runs CMD.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
