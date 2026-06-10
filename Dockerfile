# --- web (UI Next.js, export statique) ---
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package*.json ./
# npm install (et non ci) : le lock genere sous Windows ne couvre pas les deps
# optionnelles Linux/musl (ex. @emnapi pour lightningcss/oxide de Tailwind v4).
RUN npm install --no-audit --no-fund
COPY web ./
RUN npm run build

# --- deps (API) ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- build (API) ---
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- runtime ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=web /web/out ./public
COPY package*.json ./
COPY llms.txt ./
EXPOSE 8080
CMD ["node", "dist/server.js"]
