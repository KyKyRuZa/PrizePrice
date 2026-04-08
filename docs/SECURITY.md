# Security Notes

Last updated: 2026-03-13

## Authentication model

- Auth session is based on `httpOnly` cookies:
  - access cookie: `pp_access_token`
  - refresh cookie: `pp_refresh_token` (`/api/auth/refresh`)
- API still accepts `Authorization: Bearer <token>` for backward compatibility.
- JWT secrets must be at least 32 characters in production.

## CSRF model (cookie-based auth)

### SameSite policy

- `httpOnly` is always enabled for auth cookies.
- In production:
  - `AUTH_COOKIE_SECURE=true` is mandatory.
  - `AUTH_COOKIE_SAMESITE` must be `lax` or `strict`.
  - `AUTH_COOKIE_SAMESITE=none` is blocked by preflight.
- Default production posture is `AUTH_COOKIE_SAMESITE=lax`.

### CORS whitelist policy

- API CORS is credentialed (`credentials: true`) and scoped to `CLIENT_ORIGIN`.
- `CLIENT_ORIGIN` is treated as the trusted frontend allow-list entry (exact origin match).
- In production, `CLIENT_ORIGIN` must be `https://...`.
- Do not use wildcard origins for authenticated browser traffic.

### Browser verification checklist

- Open browser DevTools -> Application -> Cookies.
- Check both auth cookies (`pp_access_token`, `pp_refresh_token`) have:
  - `HttpOnly = true`
  - `Secure = true` in production
  - `SameSite = Lax` (or `Strict` if configured)
- Verify `Domain` is either host-only (empty in config) or explicitly configured valid domain (`AUTH_COOKIE_DOMAIN`).

### Do we need a CSRF token now?

- Current decision: **CSRF token is not required in the current architecture**.
- Rationale:
  - auth cookies are `SameSite=lax|strict` in production;
  - authenticated writes are API calls with JSON bodies;
  - CORS is restricted to a trusted frontend origin.
- CSRF token becomes required if at least one of these changes:
  - `SameSite=None` is introduced;
  - cross-site embedding or third-party frontend origins are allowed;
  - authenticated writes accept browser form submissions from cross-site contexts.
- If/when those conditions appear, use explicit CSRF protection (double-submit or synchronizer token) plus Origin/Referer checks for mutating methods.

## XSS and token safety

- Tokens are not persisted in frontend `localStorage`.
- Backend sanitizes search/user text input before persistence.
- Required controls:
  - strict input sanitization and output encoding
  - CSP in reverse proxy / web server and API runtime
  - no unsafe dynamic HTML insertion

## Rate limiting

- Reverse proxy rate limiting in Caddy (`caddy-ratelimit`) for edge/API/auth paths.
- Global API limiter protects non-auth endpoints.
- Auth-specific limiters protect OTP/login/reset flows.
- `Retry-After` and `requestId` are returned for operational traceability.

## Redis requirements

- OTP and rate-limit storage must use Redis in production.
- In-memory fallback is disabled in production (fail-fast on Redis unavailability).
- Redis HA modes are supported in production: `sentinel` and `cluster`.
- Runtime Redis errors trigger fail-fast behavior when Redis is required.

## Logging and observability

- Structured JSON logs include request correlation metadata (`requestId`, `userId`, `method`, `path`).
- Optional file sink can be enabled with `LOG_FILE_PATH`.
- `/metrics` should be protected with `METRICS_TOKEN` in production.

## Deployment hardening checklist

- HTTPS-only `CLIENT_ORIGIN` in production.
- Strong secrets for JWT/DB/metrics.
- Security headers in web server config.
- Separate watcher process from API role.
- Preflight checks must pass before startup.
