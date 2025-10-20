###############
# Base deps
###############
FROM node:18-bullseye-slim AS deps
WORKDIR /app
COPY package*.json ./
# Install deps (includes dev for tsx runtime)
RUN npm ci

###############
# Build
###############
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

###############
# Runtime
###############
FROM node:18-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules (includes tsx) and built assets
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/server ./server
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "start"]
