# ADR 0001: Multi-Container Production Runtime

- **Status**: Accepted
- **Date**: 2026-03-24
- **Updated**: 2026-04-07

## Context

The project originally used a single-container production runtime (all services in one container). This was simple but had significant drawbacks:

- No independent health checks per service
- Shared process space — one crash affects everything
- No network isolation between components
- Difficult to debug issues
- Couldn't scale services independently

## Decision

Use **separate containers** per service in production, orchestrated via Docker Compose.

### Services

| Service | Image | Role |
|---------|-------|------|
| `postgres` | `postgres:17.7-alpine` | Database |
| `redis` | `redis:8.2-alpine` | Cache + rate limiting |
| `server` | Custom (Node.js) | Backend API |
| `caddy` | `caddy:2-alpine` | Edge proxy + HTTPS + static files |

### Architecture

```
                    ┌──────────┐
   HTTPS ──────►    │  Caddy   │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         /api/*    /health      /* (static)
              │          │          │
              ▼          │          ▼
        ┌─────────┐      │    /srv/static
        │ server  │      │    (client/dist)
        │  :3001  │      │
        └────┬────┘      │
             │           │
      ┌──────┼──────┐    │
      │      │      │    │
      ▼      ▼      ▼    │
   ┌────┐ ┌───┐ ┌────┐  │
   │ PG │ │ R │ │etc │  │
   └────┘ └───┘ └────┘  │
```

## Consequences

- **Positive:**
  - Independent health checks per service
  - Process isolation — one crash doesn't kill everything
  - Network isolation via Docker network
  - Clear service boundaries for debugging
  - Caddy handles static files with gzip/brotli compression
  - Automatic HTTPS via Caddy (Let's Encrypt)

- **Negative:**
  - More containers to manage
  - Requires Docker Compose for orchestration
  - Static files must be built before deployment

## Implementation Notes

- Build: `infra/docker/Dockerfile` (target: `server`)
- Client build: `npm run build` in `client/` → `client/dist/`
- Compose: `infra/docker/docker-compose.prod.yml`
- Edge proxy: `infra/caddy/Caddyfile`
- Static files: mounted from `client/dist/` into Caddy container

## Deployment

```bash
# 1. Build client
cd client && npm run build

# 2. Deploy
cd infra/docker
docker compose -f docker-compose.prod.yml up -d --build
```
