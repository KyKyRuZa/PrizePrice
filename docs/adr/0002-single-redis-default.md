# ADR 0002: Single Redis Default

- Status: Accepted
- Date: 2026-03-24

## Context

The project no longer uses Sentinel as its default operational path. The active production setup is a single application container with one embedded Redis instance.

## Decision

Use one Redis instance as the default and documented runtime mode.

- `REDIS_MODE=single`
- `REDIS_URL=redis://127.0.0.1:6379`

Redis remains mandatory for OTP and rate limiting in production, but Sentinel-specific deploy artifacts are removed from the default path.

## Consequences

- Positive:
  - Lower deployment complexity.
  - Clearer environment configuration.
  - Easier operational onboarding.
- Negative:
  - No built-in Redis HA in the default deployment path.

## Implementation Notes

- Default production env: `deploy/.env.prod.example`
- Default compose file: `deploy/docker-compose.prod.yml`
- Runbook procedures now assume the single Redis path by default.
