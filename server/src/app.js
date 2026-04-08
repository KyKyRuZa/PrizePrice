import fs from "fs";
import path from "path";

import express from "express";
import cors from "cors";
import helmet from "helmet";

import { config } from "./config/index.js";
import { apiRouter } from "./routes/index.js";
import { register, metricsMiddleware } from "./middlewares/metrics.middleware.js";
import { requestIdMiddleware, requestLogMiddleware } from "./middlewares/requestContext.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { globalApiRateLimiter } from "./middlewares/rateLimit.middleware.js";
import { getReadinessState } from "./runtime/readiness.js";

export function createApp() {
  const app = express();
  const staticDir = process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : path.resolve(process.cwd(), "public");
  const hasStaticBundle = fs.existsSync(staticDir);

  app.disable("x-powered-by");
  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:", "wss:"],
          fontSrc: ["'self'", "data:", "https:"],
        },
      },
      referrerPolicy: { policy: "no-referrer" },
    })
  );
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );

  app.use(express.json({ limit: config.bodyLimit }));
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);
  app.use(requestLogMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/ready", (_req, res) => {
    const state = getReadinessState();
    if (!state.ready) {
      return res.status(503).json({ ok: false, reason: state.reason });
    }
    return res.json({ ok: true });
  });

  if (config.metricsEnabled) {
    app.get("/metrics", async (req, res) => {
      if (config.metricsToken) {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (token !== config.metricsToken) {
          return res.status(401).json({ error: "UNAUTHORIZED" });
        }
      }

      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    });
  }

  app.use("/api", globalApiRateLimiter, apiRouter);
  app.use("/api", (req, res) => {
    const payload = { error: "NOT_FOUND" };
    if (req.requestId) payload.requestId = req.requestId;
    res.status(404).json(payload);
  });

  if (hasStaticBundle) {
    app.use(express.static(staticDir));
    app.get(/^(?!\/api(?:\/|$)|\/metrics$).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  // error handler (must be last)
  app.use(errorHandler);

  return app;
}

// Export the app for testing purposes
export const app = createApp();
