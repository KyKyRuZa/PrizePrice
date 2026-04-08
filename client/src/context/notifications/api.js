import { apiDelete, apiGet, apiPost } from "../../utils/apiClient";
import { DEFAULT_NOTIFICATIONS_LIMIT, UNREAD_POLL_LIMIT } from "./constants";
import { notificationsResponseSchema, okResponseSchema } from "../../contracts/apiSchemas";

export function fetchNotifications(token, { limit = DEFAULT_NOTIFICATIONS_LIMIT, unreadOnly = false } = {}) {
  return apiGet(
    `/me/notifications?limit=${encodeURIComponent(limit)}&unreadOnly=${encodeURIComponent(String(unreadOnly))}`,
    { token, schema: notificationsResponseSchema }
  );
}

export function fetchUnreadCount(token) {
  return apiGet(`/me/notifications?limit=${UNREAD_POLL_LIMIT}`, {
    token,
    schema: notificationsResponseSchema,
  });
}

export function markNotificationRead(token, notificationId) {
  return apiPost(`/me/notifications/${notificationId}/read`, null, { token, schema: okResponseSchema });
}

export function markAllNotificationsRead(token) {
  return apiPost("/me/notifications/read-all", null, { token, schema: okResponseSchema });
}

export function deleteNotification(token, notificationId) {
  return apiDelete(`/me/notifications/${notificationId}`, { token, schema: okResponseSchema });
}
