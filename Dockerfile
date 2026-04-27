# Multi-stage build for production
FROM ghcr.io/railwayapp/nixpacks:ubuntu-1745885067 AS base

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# ES: `npm ci` resuelve `workspace:*` — hace falta el árbol de workspaces, no solo package.json.
# EN: workspace protocol requires monorepo package roots on disk before npm ci.
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# ES: Next inyecta NEXT_PUBLIC_* en build. EN: Next bakes NEXT_PUBLIC_* at build time.
ARG NEXT_PUBLIC_GAME_NAME=NexusWorld3D
ARG NEXT_PUBLIC_COLYSEUS_ROOM=nexus-world
ARG NEXT_PUBLIC_SOCKET_URL=
ENV NEXT_PUBLIC_GAME_NAME=$NEXT_PUBLIC_GAME_NAME
ENV NEXT_PUBLIC_COLYSEUS_ROOM=$NEXT_PUBLIC_COLYSEUS_ROOM
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

# Build the application
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src
COPY --from=builder /app/resources ./resources
COPY --from=builder /app/worlds ./worlds
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/nexusworld3d.config.ts ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/postcss.config.mjs ./

# Expose port (Railway will override with $PORT)
EXPOSE 3000

# Start the unified server (Next.js + Colyseus)
CMD ["npm", "run", "start"]

