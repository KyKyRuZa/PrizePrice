import { beforeAll } from "vitest";

import { config } from "./src/config/index.js";

const UNSAFE_TEST_DB_OVERRIDE_ENV = "ALLOW_UNSAFE_TEST_DATABASE";
const SAFE_TEST_DB_NAME_RE = /(^|[_-])(test|testing|vitest|ci)([_-]|$)/i;

function normalizeDbNameFromUrl(databaseUrl) {
  try {
    const parsed = new URL(String(databaseUrl || ""));
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, "")).trim();
  } catch {
    return "";
  }
}

function maskDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(String(databaseUrl || ""));
    if (parsed.username) parsed.username = "***";
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return String(databaseUrl || "");
  }
}

function assertSafeVitestDatabase() {
  const allowUnsafe = String(process.env[UNSAFE_TEST_DB_OVERRIDE_ENV] || "").toLowerCase() === "true";
  if (allowUnsafe) return;

  const nodeEnv = String(config.nodeEnv || "").toLowerCase();
  if (nodeEnv !== "test") {
    throw new Error(
      `[TEST_SAFETY] Refusing to run tests because NODE_ENV is "${nodeEnv || "undefined"}", expected "test". ` +
      `Set NODE_ENV=test before running Vitest.`
    );
  }

  const databaseUrl = String(config.databaseUrl || "").trim();
  const dbName = normalizeDbNameFromUrl(databaseUrl);

  if (!dbName || !SAFE_TEST_DB_NAME_RE.test(dbName)) {
    throw new Error(
      `[TEST_SAFETY] Refusing to run tests against a non-test DATABASE_URL.\n` +
      `Current DATABASE_URL: ${maskDatabaseUrl(databaseUrl)}\n` +
      `Detected DB name: ${dbName || "<unknown>"}\n` +
      `Use a dedicated test DB (example: prizeprice_test), or set ${UNSAFE_TEST_DB_OVERRIDE_ENV}=true to bypass intentionally.`
    );
  }
}

beforeAll(() => {
  assertSafeVitestDatabase();
});
