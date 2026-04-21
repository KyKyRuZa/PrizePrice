import React, { useEffect, useMemo, useState } from "react";

import { apiGet } from "../utils/api/apiClient";
import { initializeLocalData, syncAllUserData } from "../utils/user/syncUserData";
import { createAuthActions } from "./auth/actions";
import { USER_SYNC_INTERVAL_MS } from "./auth/constants";
import { readStoredSession } from "./auth/storage";
import { userResponseSchema } from "../contracts/apiSchemas";
import { createStrictContext } from "./createStrictContext";

export const [AuthContext, useAuth] = createStrictContext({
  name: "AuthProvider",
  hookName: "useAuth",
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем сессию при загрузке через /api/me (куки отправляются автоматически)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = readStoredSession();
      // Если есть сохранённый пользователь из предыдущей сессии, показываем его сразу
      if (stored.user) {
        setUser(stored.user);
      }

      try {
        const data = await apiGet("/me", { schema: userResponseSchema });
        if (cancelled || !data?.user) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }
        setUser(data.user);
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthenticated = Boolean(user);

  const actions = useMemo(() => createAuthActions({ setUser }), [setUser]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      setUser,
      ...actions,
    }),
    [user, isAuthenticated, isLoading, setUser, actions]
  );

  // Инициализация localStorage для избранного/истории при входе
  useEffect(() => {
    if (isAuthenticated) {
      initializeLocalData().catch((error) => {
        console.error("Error initializing local data:", error);
      });

      syncAllUserData().catch((error) => {
        console.error("Error performing initial sync:", error);
      });
    }
  }, [isAuthenticated]);

  // Периодическая синхронизация
  useEffect(() => {
    let intervalId = null;

    if (isAuthenticated) {
      intervalId = setInterval(() => {
        syncAllUserData().catch((error) => {
          console.error("Periodic sync failed:", error);
        });
      }, USER_SYNC_INTERVAL_MS);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  return React.createElement(AuthContext.Provider, { value }, children);
};
