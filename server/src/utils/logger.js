import fs from "fs";
import path from "path";

import { config } from "../config/index.js";
import { getRequestContext } from "../runtime/requestContext.js";

let logFileStream = null;
let logFileInitAttempted = false;

function stripUndefined(obj) {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined) cleaned[key] = value;
  }
  return cleaned;
}

function isTestRuntime() {
  const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
  if (nodeEnv === "test") return true;
  if (process.env.VITEST) return true;

  const lifecycleEvent = String(process.env.npm_lifecycle_event || "").toLowerCase();
  if (lifecycleEvent.startsWith("test")) return true;

  return process.argv.some((arg) => String(arg).toLowerCase().includes("vitest"));
}

function getRequestMeta() {
  const context = getRequestContext();
  if (!context) return {};
  return {
    requestId: context.requestId,
    userId: context.userId,
  };
}

function safeConsoleError(payload) {
  try {
    console.error(JSON.stringify(payload));
  } catch {
    // ignore console formatting failures
  }
}

function getLogFileStream() {
  if (logFileInitAttempted) return logFileStream;
  logFileInitAttempted = true;

  if (!config.logFilePath) {
    return null;
  }

  try {
    const resolvedPath = path.isAbsolute(config.logFilePath)
      ? config.logFilePath
      : path.resolve(process.cwd(), config.logFilePath);

    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    logFileStream = fs.createWriteStream(resolvedPath, {
      flags: "a",
      encoding: "utf8",
    });

    logFileStream.on("error", (error) => {
      safeConsoleError({
        ts: new Date().toISOString(),
        level: "error",
        msg: "logger_file_stream_error",
        message: error?.message,
      });
      logFileStream = null;
    });

    return logFileStream;
  } catch (error) {
    safeConsoleError({
      ts: new Date().toISOString(),
      level: "error",
      msg: "logger_file_stream_init_failed",
      message: error?.message,
    });
    return null;
  }
}

function writeToFile(line) {
  const stream = getLogFileStream();
  if (!stream) return;
  stream.write(`${line}\n`);
}

function write(level, message, meta = {}) {
  if (isTestRuntime() && process.env.LOG_IN_TEST !== "true") {
    return;
  }

  if (level === "debug" && !config.debugLogging) {
    return;
  }

  const payload = stripUndefined({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...getRequestMeta(),
    ...meta,
  });

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }

  writeToFile(line);
}

export async function closeLogger() {
  if (!logFileStream) return;

  const stream = logFileStream;
  logFileStream = null;
  logFileInitAttempted = false;

  await new Promise((resolve) => stream.end(resolve));
}

export const logger = {
  info(message, meta) {
    write("info", message, meta);
  },
  warn(message, meta) {
    write("warn", message, meta);
  },
  debug(message, meta) {
    write("debug", message, meta);
  },
  error(message, meta) {
    write("error", message, meta);
  },
};
