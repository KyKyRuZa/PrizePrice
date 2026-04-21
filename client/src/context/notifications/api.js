import { apiDelete, apiGet, apiPost } from "../../utils/api/apiClient";
import { DEFAULT_NOTIFICATIONS_LIMIT, UNREAD_POLL_LIMIT } from "./constants";
import { notificationsResponseSchema, okResponseSchema } from "../../contracts/apiSchemas";

export function fetchNotifications({ limit = DEFAULT_NOTIFICATIONS_LIMIT, unreadOnly = false } = {}) {
  return apiGet(
    `/me/notifications?limit=${encodeURIComponent(limit)}&unreadOnly=${encodeURIComponent(String(unreadOnly))}`,
    { schema: notificationsResponseSchema }
  );
}

export function fetchUnreadCount() {
  return apiGet(`/me/notifications?limit=${UNREAD_POLL_LIMIT}`, {
    schema: notificationsResponseSchema,
  });
}

export function markNotificationRead(notificationId) {
  return apiPost(`/me/notifications/${notificationId}/read`, null, { schema: okResponseSchema });
}

export function markAllNotificationsRead() {
  return apiPost("/me/notifications/read-all", null, { schema: okResponseSchema });
}

export function deleteNotification(notificationId) {
  return apiDelete(`/me/notifications/${notificationId}`, { schema: okResponseSchema });
}
