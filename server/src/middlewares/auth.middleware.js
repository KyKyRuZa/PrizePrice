import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { User } from "../models/index.js";
import { setRequestContextValue } from "../runtime/requestContext.js";
import { getAccessTokenFromCookies } from "../utils/session.js";

function extractBearer(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return getAccessTokenFromCookies(req);
}

function isTokenIssuedBeforePasswordUpdate(payload, user) {
  if (!user?.passwordUpdatedAt) return false;

  const passwordUpdatedMs = new Date(user.passwordUpdatedAt).getTime();
  if (!Number.isFinite(passwordUpdatedMs)) return false;

  const passwordUpdatedAtSec = Math.floor(passwordUpdatedMs / 1000);
  const tokenIssuedAtSec = Number(payload?.iat);
  if (!Number.isFinite(tokenIssuedAtSec)) return true;

  return tokenIssuedAtSec < passwordUpdatedAtSec;
}

function touchLastSeen(userId) {
  // Fire-and-forget: don't await to avoid latency
  User.update(
    { lastSeen: new Date() },
    { where: { id: userId } }
  ).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to update last_seen:", err);
  });
}

/**
 * Требует корректный JWT.
 */
export async function authRequired(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    // Находим пользователя в базе данных
    const user = await User.findByPk(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    if (isTokenIssuedBeforePasswordUpdate(payload, user)) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

     // Добавляем информацию о пользователе в запрос
     req.user = user.toJSON();
     req.userId = payload.userId;
     req.phone = payload.phone;
     setRequestContextValue("userId", payload.userId);

     // Обновляем last_seen (fire-and-forget)
     touchLastSeen(payload.userId);

     return next();
  } catch {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
}

/**
 * Если JWT есть и он валиден — кладёт payload в req.user. Иначе просто пропускает.
 */
export async function authOptional(req, _res, next) {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);

    // Находим пользователя в базе данных
    const user = await User.findByPk(payload.userId);
     if (user && !isTokenIssuedBeforePasswordUpdate(payload, user)) {
       // Добавляем информацию о пользователе в запрос
       req.user = user.toJSON();
       req.userId = payload.userId;
       req.phone = payload.phone;
       setRequestContextValue("userId", payload.userId);

       // Обновляем last_seen (fire-and-forget)
       touchLastSeen(payload.userId);
     }
  } catch {
    // ignore invalid tokens
  }
  return next();
}
