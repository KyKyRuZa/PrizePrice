import bcrypt from "bcryptjs";
import { config } from "../config/index.js";

export function validatePassword(password) {
  const p = String(password || "");
  if (p.length < config.passwordMinLength) {
    return { ok: false, error: `PASSWORD_TOO_SHORT (min ${config.passwordMinLength})` };
  }
  if (p.length > 256) {
    return { ok: false, error: "PASSWORD_TOO_LONG" };
  }
  return { ok: true };
}

export async function hashPassword(password) {
  const rounds = Number(config.bcryptSaltRounds || 10);
  return bcrypt.hash(String(password), rounds);
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  try {
    return await bcrypt.compare(String(password), String(passwordHash));
  } catch {
    return false;
  }
}
