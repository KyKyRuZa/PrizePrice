# PrizePrice Backend

Backend service for PrizePrice: authentication, product catalog, favorites, comparison cart, profile data, Prometheus metrics, and the price watcher job.

## Local Development

### 1. Start Postgres and Redis

```bash
cd server
docker compose up -d
```

### 2. Install dependencies and start the API

```bash
cp infra/env/.env.dev server/.env  # скопировать dev конфиг
# Отредактировать DATABASE_URL/REDIS_URL если запускаешь локально (не в Docker)
npm install
npm run dev
```

The API will be available at:

- `http://localhost:3001`
- `http://localhost:3001/health`
- `http://localhost:3001/ready`
- `http://localhost:3001/metrics`

## Main Endpoints

- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/login-password`
- `GET /api/products/recommended`
- `GET /api/products/search?q=iphone&sort=price_asc`
- `GET /api/me`
- `POST /api/me/email`
- `POST /api/me/name`
- `POST /api/me/password`
- `GET /api/me/history`
- `GET /api/me/favorites`
- `POST /api/me/favorites/:productId`
- `DELETE /api/me/favorites/:productId`
- `GET /api/me/cart`
- `POST /api/me/cart/:productId`
- `DELETE /api/me/cart/:productId`

## Runtime Notes

- Database schema is managed through migrations in `server/src/migrations`.
- On boot, pending migrations can run automatically with `RUN_DB_MIGRATIONS_ON_BOOT=true`.
- Demo catalog seed runs only when products and offers are empty.
- In local development, the API process can run the watcher directly.
- In the production deploy image, API, watcher, frontend bundle, Redis, Postgres, and Caddy run inside one container. See [deploy/README.md](../deploy/README.md).

## Production Safety

- `JWT_SECRET` is required in `NODE_ENV=production`.
- `DEBUG_RETURN_OTP` and `DEBUG_ADMIN` are forced off in production.
- If `/metrics` is enabled in production, `METRICS_TOKEN` is required.
- OTP and rate limiting are fail-fast in production and require Redis.
- The default production setup uses one Redis instance: `REDIS_MODE=single`.
- `X-Request-Id` is attached to responses and included in structured logs.
- `/health` is liveness, `/ready` is readiness.

## Price Watcher Load Test

```bash
cd server
WATCHER_LOAD_WATCH_COUNT=1000 \
WATCHER_LOAD_CYCLES=1 \
WATCHER_LOAD_TARGET_CYCLE_SECONDS=30 \
npm run load:price-watcher
```

The report includes:

- `durationSeconds`
- `errors`
- `cpuPercentSingleCore`
- `rssMiBPeak`
- `heapUsedMiBPeak`

## Documentation

- OpenAPI: `server/docs/openapi.yaml`
- ADR index: `docs/adr/README.md`
- Runbook: `docs/RUNBOOK.md`
- Security notes: `docs/SECURITY.md`
- Changelog: `docs/CHANGELOG.md`
- Monitoring guide: `docs/MONITORING.md`
- Prometheus alert rules: `../monitoring/alerts.prometheus.yml`
- Frontend env template: `client/.env.example`
