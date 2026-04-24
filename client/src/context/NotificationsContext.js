import React, { useEffect, useMemo, useState, useCallback } from "react";

import { useAuth } from "./AuthContext";
import { createStrictContext } from "./createStrictContext";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications/api";
import { DEFAULT_NOTIFICATIONS_LIMIT, UNREAD_POLL_INTERVAL_MS, UNREAD_POLL_LIMIT } from "./notifications/constants";
import { useSyncedRef } from "./shared/contextUtils";

export const [NotificationsContext, useNotifications] = createStrictContext({
  name: "NotificationsProvider",
  hookName: "useNotifications",
});

export const NotificationsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const itemsRef = useSyncedRef(items);

  const refresh = useCallback(async ({ limit = DEFAULT_NOTIFICATIONS_LIMIT, unreadOnly = false } = {}) => {
    if (!isAuthenticated) {
      if (!unreadOnly) setItems([]);
      setUnreadCount(0);
      return;
    }

    const data = await fetchNotifications({ limit, unreadOnly });
    if (!unreadOnly) {
      setItems(Array.isArray(data?.items) ? data.items : []);
    }
    setUnreadCount(Number(data?.unreadCount ?? 0));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      return undefined;
    }

    // Первоначальная загрузка всех уведомлений
    refresh();

    // Интервал обновляет только счетчик unread (одним запросом)
    const timer = setInterval(() => refresh({ unreadOnly: true }), UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const markRead = useCallback(async (id) => {
    const notificationId = Number(id);
    if (!Number.isFinite(notificationId)) return;

    setItems((prev) =>
      Array.isArray(prev)
        ? prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
        : prev
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    if (isAuthenticated) {
      markNotificationRead(notificationId)
        .then(() => refresh({ unreadOnly: true }))
        .catch(() => null);
    }
  }, [isAuthenticated, refresh]);

  const markAll = useCallback(async () => {
    setItems((prev) => (Array.isArray(prev) ? prev.map((item) => ({ ...item, read: true })) : prev));
    setUnreadCount(0);

    if (isAuthenticated) {
      markAllNotificationsRead()
        .then(() => refresh({ unreadOnly: true }))
        .catch(() => null);
    }
  }, [isAuthenticated, refresh]);

  const remove = useCallback(async (id) => {
    const notificationId = Number(id);
    if (!Number.isFinite(notificationId)) return;

    setItems((prev) => (Array.isArray(prev) ? prev.filter((item) => item.id !== notificationId) : prev));

    if (isAuthenticated) {
      deleteNotification(notificationId)
        .then(() => refresh({ unreadOnly: true }))
        .catch(() => null);
    }
  }, [isAuthenticated, refresh]);

  const value = useMemo(() => ({
    items,
    unreadCount,
    refresh,
    markRead,
    markAll,
    remove,
  }), [items, unreadCount, refresh, markRead, markAll, remove]);

  return React.createElement(NotificationsContext.Provider, { value }, children);
};

export default NotificationsProvider;
