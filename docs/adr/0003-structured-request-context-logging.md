# ADR 0003: Structured Request Context Logging

- Status: Accepted
- Date: 2026-02-28

## Context

Logs were structured JSON, but request metadata had to be passed manually in many places. This caused inconsistent `requestId`/`userId` coverage.

## Decision

Introduce async request context with `AsyncLocalStorage` and enrich all logger calls automatically with request metadata.

## Consequences

- Positive:
  - Uniform correlation by `requestId` in all logs generated during request handling.
  - Reduced repetitive boilerplate in controllers and services.
- Negative:
  - Slight runtime overhead from async context tracking.

## Implementation Notes

- Context runtime: `server/src/runtime/requestContext.js`.
- Middleware starts context in `requestIdMiddleware`.
- Auth middleware writes `userId` into context after token validation.
- Logger reads context automatically and optionally writes to file if `LOG_FILE_PATH` is configured.
