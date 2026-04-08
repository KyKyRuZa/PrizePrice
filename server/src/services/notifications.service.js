import { Notification } from "../models/index.js";

export async function createNotification(userId, { type = "PRICE", productId = null, title, body, link = "" }) {
  const n = await Notification.create({
    userId,
    type: String(type || "PRICE"),
    productId: productId == null ? null : Number(productId),
    title: String(title || ""),
    body: String(body || ""),
    link: String(link || ""),
  });
  const row = n.toJSON();
  return { ...row, created_at: row.createdAt };
}

export async function listNotifications(userId, { limit = 50, unreadOnly = false } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const where = { userId };
  if (unreadOnly) where.read = false;

  const rows = await Notification.findAll({
    where,
    attributes: ["id", "type", "productId", "title", "body", "link", "read", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: lim,
    raw: true,
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    product_id: r.productId,
    title: r.title,
    body: r.body,
    link: r.link,
    read: r.read,
    created_at: r.createdAt,
  }));
}

export async function countUnread(userId) {
  return await Notification.count({ where: { userId, read: false } });
}

export async function markNotificationRead(userId, notificationId) {
  await Notification.update({ read: true }, { where: { userId, id: notificationId } });
}

export async function markAllRead(userId) {
  await Notification.update({ read: true }, { where: { userId, read: false } });
}

export async function deleteNotification(userId, notificationId) {
  await Notification.destroy({ where: { userId, id: notificationId } });
}
