# syntax=docker/dockerfile:1

# --- build: bundle do SPA (Vite + PWA) e da API (esbuild) ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# --- deps: só as dependências de produção da API ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- runtime: um processo Node serve o SPA e a API (/api) na porta 8080 ---
FROM node:24-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY server/seed/raw ./server/seed/raw
COPY package.json ./
USER node
EXPOSE 8080
CMD ["node", "dist-server/index.js"]
