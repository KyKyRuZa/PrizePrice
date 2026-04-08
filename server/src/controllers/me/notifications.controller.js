import { z } from "zod";

import {
  countUnread,
  deleteNotification,
  listNotifications,
  markAllRead,
  markNotificationRead,
} from "../../services/notifications.service.js";
import { requireFiniteParam } from "./shared.js";

const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") return value;
      return String(value || "").toLowerCase() === "true";
    }),
});

export async function notifications(req, res) {
  const parsed = notificationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR" });
  }

  const limit = parsed.data.limit;
  const unreadOnly = parsed.data.unreadOnly ?? false;
  const items = await listNotifications(req.userId, { limit, unreadOnly });
  const unreadCount = await countUnread(req.userId);
  return res.json({ items, unreadCount });
}

export async function notificationRead(req, res) {
  const id = requireFiniteParam(req, res, "id");
  if (id === null) return;

  await markNotificationRead(req.userId, id);
  return res.json({ ok: true });
}

export async function notificationReadAll(req, res) {
  await markAllRead(req.userId);
  return res.json({ ok: true });
}

export async function notificationDelete(req, res) {
  const id = requireFiniteParam(req, res, "id");
  if (id === null) return;

  await deleteNotification(req.userId, id);
  return res.json({ ok: true });
}
