# Runbook

Last updated: 2026-03-24

## Deployment Model

Production runs as a single `app` container defined in `deploy/docker-compose.prod.yml`.

Inside that container:

- Postgres
- Redis
- backend API
- frontend static bundle
- price watcher
- Caddy

## 1. App unavailable

1. Check service status:
   - `docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml ps`
2. Inspect logs:
   - `docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml logs -f --tail=300 app`
3. Verify readiness:
   - `curl -s https://prizeprise.ru/ready`
4. If startup failed, inspect container boot sequence:
   - Postgres init/start
   - Redis start
   - API start
   - Caddy start

Recovery criteria:

- `/ready` returns `200`.
- API `5xx` rate returns to baseline.

## 2. OTP or rate limiting errors (`OTP_UNAVAILABLE`, `RATE_LIMIT_UNAVAILABLE`)

1. Check Redis boot and runtime logs in the `app` container.
2. Confirm production env keeps Redis mandatory:
   - `OTP_REQUIRE_REDIS=true`
   - `RATE_LIMIT_REQUIRE_REDIS=true`
3. Confirm single Redis mode is configured:
   - `REDIS_MODE=single`
   - `REDIS_URL=redis://127.0.0.1:6379`
4. Restart the `app` container after fixing env or data-dir issues.

Diagnostics:

- `docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml logs -f --tail=400 app`

Recovery criteria:

- No fresh `OTP_UNAVAILABLE` or `RATE_LIMIT_UNAVAILABLE` errors for 15 minutes.
- Auth endpoints return expected `200/400/429` only.

## 3. Auth degradation (429/503 spikes)

1. Validate whether traffic spike is expected.
2. Check edge and app limits together:
   - Caddy rate-limit zones
   - app middleware limits in `server/src/middlewares/rateLimit.middleware.js`
3. Check Redis availability and latency inside the container.
4. Confirm no unsafe production config was deployed:
   - `OTP_REQUIRE_REDIS=true`
   - `RATE_LIMIT_REQUIRE_REDIS=true`
5. If needed, tune limits in a controlled rollout and observe 30+ minutes.

Diagnostics:

- `curl -i https://prizeprise.ru/api/auth/request-code -H "Content-Type: application/json" -d '{"phone":"+79991234567"}'`

Recovery criteria:

- `429` rate for `/api/auth/*` returns near baseline.
- `503` rate for auth endpoints is zero.

## 4. `/metrics` returns 401 unexpectedly

1. Verify `METRICS_TOKEN` is set in `deploy/.env.prod`.
2. Verify request uses:
   - `Authorization: Bearer <METRICS_TOKEN>`
3. Verify Caddy forwards the `Authorization` header unchanged.
4. Validate endpoint inside the container if needed.

Diagnostics:

- `curl -i https://prizeprise.ru/metrics`
- `curl -i -H "Authorization: Bearer <METRICS_TOKEN>" https://prizeprise.ru/metrics`

Recovery criteria:

- Authorized request returns `200` and Prometheus payload.
- Unauthorized request returns `401`.

## 5. OpenAPI/docs contract test failure

1. Run docs contract test locally:
   - `npm --prefix server run test:run -- tests/openapi.contract.unit.test.js`
2. Compare failing route/operation with current router declarations:
   - `server/src/routes/index.js`
   - `server/src/routes/*.routes.js`
3. Update `server/docs/openapi.yaml` to match runtime behavior.
4. If API behavior changed intentionally, update:
   - `docs/CHANGELOG.md`
   - `docs/MONITORING.md`
   - `docs/RUNBOOK.md`

Recovery criteria:

- Docs contract test passes.
- Changelog and operational docs are updated in the same change set.

## 6. Watcher failures or notification anomalies

1. Check watcher logs inside the shared `app` container:
   - `docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml logs -f --tail=300 app`
2. Verify watcher env:
   - `PRICE_WATCHER_ENABLED=true`
   - `ALLOW_API_PRICE_WATCHER_IN_PRODUCTION=true`
   - `PRICE_WATCHER_NOTIFY_COOLDOWN_MINUTES`
3. Verify DB indexes and migrations were applied.
4. Check watcher metrics:
   - `increase(price_watcher_errors_total[10m])`
   - `increase(price_watcher_errors_total{stage="iteration"}[10m])`
   - `increase(price_watcher_errors_total{stage="watch"}[10m])`

Recovery criteria:

- `increase(price_watcher_errors_total[10m]) == 0` for at least 15 minutes.
- New notifications are created as expected.
- No fresh `watcher_run_failed` or `watcher_record_failed` errors in logs.

## 7. Single-container boot failure

1. Build and start the image again:
   - `docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml up -d --build`
2. Inspect the first boot logs:
   - `docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml logs --tail=300 app`
3. Check which embedded service failed first:
   - Postgres
   - Redis
   - API
   - Caddy
4. If the data volume is corrupted and this is a non-production environment, clear the app volume and retry.

Recovery criteria:

- Container stays `Up`.
- `/health` and `/ready` both return `200`.

## 8. Incident closeout checklist

1. Root cause documented.
2. Added or updated test coverage.
3. Updated changelog and runbook if process changed.
4. Linked related alert and logs in incident notes.
