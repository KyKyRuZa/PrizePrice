import React, { useEffect, useMemo, useState, useCallback } from "react";

import { useAuth } from "./AuthContext";
import { createStrictContext } from "./createStrictContext";
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications/api";
import { DEFAULT_NOTIFICATIONS_LIMIT, UNREAD_POLL_INTERVAL_MS } from "./notifications/constants";
import { useSyncedRef } from "./shared/contextUtils";

export const [NotificationsContext, useNotifications] = createStrictContext({
  name: "NotificationsProvider",
  hookName: "useNotifications",
});

export const NotificationsProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const itemsRef = useSyncedRef(items);

  const refresh = useCallback(async ({ limit = DEFAULT_NOTIFICATIONS_LIMIT, unreadOnly = false } = {}) => {
    if (!isAuthenticated || !token) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    const data = await fetchNotifications(token, { limit, unreadOnly });
    setItems(Array.isArray(data?.items) ? data.items : []);
    setUnreadCount(Number(data?.unreadCount ?? 0));
  }, [isAuthenticated, token]);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await fetchUnreadCount(token);
      setUnreadCount(Number(data?.unreadCount ?? 0));
    } catch {
      // ignore
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setItems([]);
      setUnreadCount(0);
      return undefined;
    }

    refreshUnread();

    const timer = setInterval(() => refreshUnread(), UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  const markRead = async (id) => {
    const notificationId = Number(id);
    if (!Number.isFinite(notificationId)) return;

    setItems((prev) =>
      Array.isArray(prev)
        ? prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
        : prev
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    if (isAuthenticated && token) {
      markNotificationRead(token, notificationId)
        .then(() => refreshUnread())
        .catch(() => null);
    }
  };

  const markAll = async () => {
    setItems((prev) => (Array.isArray(prev) ? prev.map((item) => ({ ...item, read: true })) : prev));
    setUnreadCount(0);

    if (isAuthenticated && token) {
      markAllNotificationsRead(token)
        .then(() => refreshUnread())
        .catch(() => null);
    }
  };

  const remove = async (id) => {
    const notificationId = Number(id);
    if (!Number.isFinite(notificationId)) return;

    setItems((prev) => (Array.isArray(prev) ? prev.filter((item) => item.id !== notificationId) : prev));

    const existing = (itemsRef.current || []).find((item) => item.id === notificationId);
    if (existing && !existing.read) setUnreadCount((count) => Math.max(0, count - 1));

    if (isAuthenticated && token) {
      deleteNotification(token, notificationId)
        .then(() => refreshUnread())
        .catch(() => null);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(
    () => ({
      items,
      unreadCount,
      refresh,
      refreshUnread,
      markRead,
      markAll,
      remove,
    }),
    [items, unreadCount, isAuthenticated, token, refresh, refreshUnread, markRead, markAll, remove]
  );

  return React.createElement(NotificationsContext.Provider, { value }, children);
};

export default { NotificationsProvider, useNotifications, NotificationsContext };
