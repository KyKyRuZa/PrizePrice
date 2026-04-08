# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Single-container production image and boot script:
  - root `Dockerfile`
  - `deploy/start-all.sh`
- Root `.dockerignore` for leaner image builds.
- Unified deploy documentation for the current production model.

### Changed

- Production deploy now runs as one `app` container instead of separate API/web/watcher services.
- Production container now embeds:
  - Postgres
  - Redis
  - backend API
  - frontend bundle
  - watcher
  - Caddy
- `README.md`, `server/README.md`, and `docs/RUNBOOK.md` now describe the single-container runtime.
- `deploy/.env.prod.example` now documents localhost Redis/Postgres inside the shared container.

### Removed

- `client/Dockerfile`
- `server/Dockerfile`
- `deploy/Caddy.Dockerfile`
- `deploy/docker-compose.prod.sentinel.yml`

## [2026-02-28]

### Added

- `server/docs/openapi.yaml` initial API contract draft.
- ADR set under `docs/adr`.
- Incident and operations runbook: `docs/RUNBOOK.md`.
- Security notes: `docs/SECURITY.md`.
- Playwright E2E scaffolding under `e2e/`.

### Changed

- Auth integration tests made independent and deterministic.
- Logger now enriches entries with automatic request context (`requestId`, `userId`).
- Optional file log sink introduced via `LOG_FILE_PATH`.
