import jwt from "jsonwebtoken";

import { config } from "../config/index.js";

const DEFAULT_ACCESS_COOKIE_NAME = "pp_access_token";
const DEFAULT_REFRESH_COOKIE_NAME = "pp_refresh_token";
const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_COOKIE_SAMESITE = "lax";

function normalizeSameSite(value) {
  const normalized = String(value || DEFAULT_COOKIE_SAMESITE).toLowerCase();
  if (normalized === "strict") return "strict";
  return "lax";
}

function isLikelyIpAddress(hostname) {
  return /^[\d.]+$/.test(hostname) || hostname.includes(":");
}

function isValidCookieDomain(hostname) {
  if (!hostname || hostname.length > 253 || hostname.includes("..")) return false;
  const labels = hostname.split(".");
  if (labels.length < 2) return false;
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      !label.startsWith("-") &&
      !label.endsWith("-") &&
      /^[a-z0-9-]+$/i.test(label)
  );
}

function normalizeCookieDomain(value) {
  const source = String(value || "").trim();
  if (!source) return undefined;

  let hostname = source.toLowerCase();
  try {
    if (hostname.includes("://")) {
      hostname = new URL(hostname).hostname.toLowerCase();
    } else if (hostname.includes("/") || hostname.includes(":")) {
      hostname = new URL(`http://${hostname}`).hostname.toLowerCase();
    }
  } catch {
    return undefined;
  }

  const domain = hostname.replace(/^\.+/, "").replace(/\.+$/, "");
  if (!domain || domain === "localhost" || domain.endsWith(".localhost")) return undefined;
  if (isLikelyIpAddress(domain)) return undefined;

  return isValidCookieDomain(domain) ? domain : undefined;
}

export function getAuthCookieNames() {
  return {
    access: config.authCookieAccessName || DEFAULT_ACCESS_COOKIE_NAME,
    refresh: config.authCookieRefreshName || DEFAULT_REFRESH_COOKIE_NAME,
  };
}

export function signAccessToken(userRec) {
  const ttlSeconds = Math.max(60, Number(config.authAccessTokenTtlSeconds || DEFAULT_ACCESS_TTL_SECONDS));
  return jwt.sign(
    { userId: userRec.id, phone: userRec.phone || userRec.email || userRec.name, type: "access" },
    config.jwtSecret,
    { expiresIn: `${ttlSeconds}s` }
  );
}

export function signRefreshToken(userRec) {
  const ttlSeconds = Math.max(120, Number(config.authRefreshTokenTtlSeconds || DEFAULT_REFRESH_TTL_SECONDS));
  return jwt.sign(
    { userId: userRec.id, type: "refresh" },
    config.jwtSecret,
    { expiresIn: `${ttlSeconds}s` }
  );
}

function buildBaseCookieOptions() {
  const secure = config.isProduction ? true : Boolean(config.authCookieSecure);
  return {
    httpOnly: true,
    secure,
    sameSite: normalizeSameSite(config.authCookieSameSite),
    domain: normalizeCookieDomain(config.authCookieDomain),
  };
}

export function setAuthCookies(res, userRec) {
  const accessToken = signAccessToken(userRec);
  const refreshToken = signRefreshToken(userRec);
  const names = getAuthCookieNames();
  const accessTtlMs =
    Math.max(60, Number(config.authAccessTokenTtlSeconds || DEFAULT_ACCESS_TTL_SECONDS)) * 1000;
  const refreshTtlMs =
    Math.max(120, Number(config.authRefreshTokenTtlSeconds || DEFAULT_REFRESH_TTL_SECONDS)) * 1000;
  const base = buildBaseCookieOptions();

  res.cookie(names.access, accessToken, {
    ...base,
    path: "/",
    maxAge: accessTtlMs,
  });
  res.cookie(names.refresh, refreshToken, {
    ...base,
    path: "/api/auth/refresh",
    maxAge: refreshTtlMs,
  });

  return accessToken;
}

export function clearAuthCookies(res) {
  const names = getAuthCookieNames();
  const base = buildBaseCookieOptions();

  res.clearCookie(names.access, {
    ...base,
    path: "/",
  });
  res.clearCookie(names.refresh, {
    ...base,
    path: "/api/auth/refresh",
  });
}

function parseCookieHeader(rawCookieHeader) {
  const source = String(rawCookieHeader || "");
  if (!source) return {};

  const pairs = source.split(";");
  const result = {};

  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!key) continue;
    result[key] = decodeURIComponent(value);
  }

  return result;
}

export function getCookieValue(req, cookieName) {
  const cookies = parseCookieHeader(req?.headers?.cookie);
  return cookies[cookieName] || null;
}

export function getAccessTokenFromCookies(req) {
  const names = getAuthCookieNames();
  return getCookieValue(req, names.access);
}

export function getRefreshTokenFromCookies(req) {
  const names = getAuthCookieNames();
  return getCookieValue(req, names.refresh);
}
