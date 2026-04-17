import client from "prom-client";

export const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

export const activeUsersTotal = new client.Gauge({
  name: "active_users_total",
  help: "Number of currently active users",
});

register.registerMetric(httpRequestDuration);
register.registerMetric(activeUsersTotal);

function normalizeJoinedRoute(baseUrl, routePath) {
  const base = String(baseUrl || "");
  const route = String(routePath || "");
  const joined = `${base}${route}`.replace(/\/{2,}/g, "/");
  if (!joined) return "/";
  return joined.startsWith("/") ? joined : `/${joined}`;
}

export function resolveRouteLabel(req) {
  const routePath = req?.route?.path;

  if (typeof routePath === "string" && routePath.length > 0) {
    return normalizeJoinedRoute(req?.baseUrl, routePath);
  }

  if (Array.isArray(routePath)) {
    const firstString = routePath.find((item) => typeof item === "string" && item.length > 0);
    if (firstString) {
      return normalizeJoinedRoute(req?.baseUrl, firstString);
    }
  }

  // Keep unmatched routes low-cardinality to avoid metrics cardinality explosion.
  return "unmatched";
}

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationSeconds = Number(end - start) / 1e9;
    const route = resolveRouteLabel(req);
    httpRequestDuration
      .labels(req.method, route, String(res.statusCode))
      .observe(durationSeconds);
  });
  next();
}
