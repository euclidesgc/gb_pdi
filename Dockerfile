# syntax=docker/dockerfile:1

# --- build: gera o bundle estático (Vite + PWA) ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# --- runtime: nginx sem root servindo o SPA na porta 8080 ---
FROM nginxinc/nginx-unprivileged:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
