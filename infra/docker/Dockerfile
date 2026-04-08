FROM node:22-alpine AS client-build

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client ./
RUN npm run build

FROM node:22-alpine AS server-deps

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ==================== Server ====================
FROM server-deps AS server

COPY server ./
EXPOSE 3001
CMD ["npm", "run", "start"]

# ==================== Caddy with static files ====================
FROM caddy:2-alpine AS caddy

COPY --from=client-build /app/client/dist /srv/static
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
