# ADR 0004: OpenAPI Contract Governance

- Status: Accepted
- Date: 2026-03-02

## Context

`server/docs/openapi.yaml` existed as a draft and periodically drifted from real route behavior.
This increased release risk because reviewers and integrators could not trust the published API contract.

## Decision

OpenAPI is the source of truth for public HTTP API behavior.

Governance policy:

1. Any public API change (endpoint, method, request shape, response shape, auth, error code) must update `server/docs/openapi.yaml` in the same PR.
2. The same PR must include/adjust docs-contract tests (`server/tests/openapi.contract.unit.test.js`).
3. The same PR must include an entry in `docs/CHANGELOG.md` under `Unreleased`.

## Consequences

- Positive:
  - API contract drift becomes visible in CI.
  - Integrators and frontend developers can rely on OpenAPI for current behavior.
  - Release notes stay aligned with contract changes.
- Negative:
  - Slightly higher PR overhead for any API-related change.

## Implementation Notes

- Contract coverage test validates route/method inventory and key auth/response constraints.
- Protected endpoints must document cookie-first plus bearer-compatibility security.
- `/metrics` auth is documented separately from user JWT auth.
