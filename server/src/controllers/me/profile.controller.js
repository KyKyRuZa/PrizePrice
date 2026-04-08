import { z } from "zod";

import { User } from "../../models/index.js";
import { getUserById } from "../../services/user.service.js";
import { hashPassword, validatePassword, verifyPassword } from "../../utils/passwords.js";
import { INPUT_LIMITS, isValidDisplayName, sanitizeEmail, sanitizeUserName } from "../../utils/sanitize.js";
import { isUniqueConstraintForField, validationError } from "./shared.js";

const emailInputSchema = z.string().trim().min(3).max(INPUT_LIMITS.EMAIL).email();

export async function me(req, res) {
  const user = await getUserById(req.userId);
  return res.json({ user });
}

export async function setPassword(req, res) {
  const schema = z.object({
    newPassword: z.string().min(1).max(INPUT_LIMITS.PASSWORD),
    currentPassword: z.string().min(1).max(INPUT_LIMITS.PASSWORD).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return validationError(res);

  const validation = validatePassword(parsed.data.newPassword);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  const userRec = await User.findByPk(req.userId);
  if (!userRec) return res.status(404).json({ error: "NOT_FOUND" });

  if (userRec.passwordHash) {
    if (!parsed.data.currentPassword) return res.status(400).json({ error: "CURRENT_PASSWORD_REQUIRED" });
    const ok = await verifyPassword(parsed.data.currentPassword, userRec.passwordHash);
    if (!ok) return res.status(400).json({ error: "INVALID_CREDENTIALS" });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await userRec.update({ passwordHash, passwordUpdatedAt: new Date() });

  const user = await getUserById(userRec.id);
  return res.json({ ok: true, user });
}

export async function setEmail(req, res) {
  const schema = z.object({ email: emailInputSchema });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return validationError(res);

  const email = sanitizeEmail(parsed.data.email);
  if (!email || !emailInputSchema.safeParse(email).success) return validationError(res);
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser && existingUser.id !== req.userId) {
    return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
  }

  const user = await User.findByPk(req.userId);
  if (!user) return res.status(404).json({ error: "NOT_FOUND" });

  try {
    await user.update({ email });
  } catch (error) {
    if (isUniqueConstraintForField(error, "email")) {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }
    throw error;
  }

  const updatedUser = await getUserById(req.userId);
  return res.json({ user: updatedUser });
}

export async function setName(req, res) {
  const schema = z.object({ name: z.string().trim().min(1).max(INPUT_LIMITS.DISPLAY_NAME) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return validationError(res);

  const name = sanitizeUserName(parsed.data.name, INPUT_LIMITS.DISPLAY_NAME);
  if (!name || !isValidDisplayName(name)) return validationError(res);

  const existingUser = await User.findOne({ where: { name } });
  if (existingUser && existingUser.id !== req.userId) {
    return res.status(409).json({ error: "NAME_ALREADY_EXISTS" });
  }

  const user = await User.findByPk(req.userId);
  if (!user) return res.status(404).json({ error: "NOT_FOUND" });

  try {
    await user.update({ name });
  } catch (error) {
    if (isUniqueConstraintForField(error, "name")) {
      return res.status(409).json({ error: "NAME_ALREADY_EXISTS" });
    }
    throw error;
  }

  const updatedUser = await getUserById(req.userId);
  return res.json({ user: updatedUser });
}
