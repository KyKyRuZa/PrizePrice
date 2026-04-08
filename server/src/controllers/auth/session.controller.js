import jwt from "jsonwebtoken";

import { clearAuthCookies, getRefreshTokenFromCookies, setAuthCookies } from "../../utils/session.js";
import { config } from "../../config/index.js";
import { User } from "../../models/index.js";

function isTokenIssuedBeforePasswordUpdate(payload, user) {
  if (!user?.passwordUpdatedAt) return false;

  const passwordUpdatedMs = new Date(user.passwordUpdatedAt).getTime();
  if (!Number.isFinite(passwordUpdatedMs)) return false;

  const passwordUpdatedAtSec = Math.floor(passwordUpdatedMs / 1000);
  const tokenIssuedAtSec = Number(payload?.iat);
  if (!Number.isFinite(tokenIssuedAtSec)) return true;

  return tokenIssuedAtSec < passwordUpdatedAtSec;
}

export async function refreshSession(req, res) {
  const refreshToken = getRefreshTokenFromCookies(req);
  if (!refreshToken) return res.status(401).json({ error: "UNAUTHORIZED" });

  try {
    const payload = jwt.verify(refreshToken, config.jwtSecret);
    if (!payload?.userId || payload?.type !== "refresh") {
      clearAuthCookies(res);
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const user = await User.findByPk(payload.userId);
    if (!user || isTokenIssuedBeforePasswordUpdate(payload, user)) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    setAuthCookies(res, user);
    return res.json({ ok: true });
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
}

export async function logoutSession(_req, res) {
  clearAuthCookies(res);
  return res.json({ ok: true });
}
