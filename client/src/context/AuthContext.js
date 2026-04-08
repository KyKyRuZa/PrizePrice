import React, { useEffect, useMemo, useState } from "react";

import { apiGet } from "../utils/apiClient";
import { initializeLocalData, syncAllUserData } from "../utils/syncUserData";
import { createAuthActions } from "./auth/actions";
import { COOKIE_SESSION_TOKEN, USER_SYNC_INTERVAL_MS } from "./auth/constants";
import { clearStoredSession, readStoredSession, saveSessionFlag, saveUser } from "./auth/storage";
import { userResponseSchema } from "../contracts/apiSchemas";
import { createStrictContext } from "./createStrictContext";

export const [AuthContext, useAuth] = createStrictContext({
  name: "AuthProvider",
  hookName: "useAuth",
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const stored = readStoredSession();
    const hasSession = Boolean(stored.session);

    if (hasSession && stored.user) {
      setUser(stored.user);
    }

    if (!hasSession) {
      if (stored.user) {
        clearStoredSession();
      }
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const data = await apiGet("/me", { schema: userResponseSchema });
        if (cancelled || !data?.user) return;
        setToken(COOKIE_SESSION_TOKEN);
        setUser(data.user);
        saveSessionFlag();
        saveUser(data.user);
      } catch {
        if (!cancelled) {
          setToken(null);
          clearStoredSession();
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

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    let cancelled = false;
    if (!token) return undefined;

    (async () => {
      try {
        const data = await apiGet("/me", { token, schema: userResponseSchema });
        if (!cancelled && data?.user) {
          setUser(data.user);
          saveSessionFlag();
          saveUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          clearStoredSession();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const actions = useMemo(() => createAuthActions({ token, setToken, setUser }), [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      isLoading,
      ...actions,
    }),
    [token, user, isAuthenticated, isLoading, actions]
  );

  useEffect(() => {
    if (isAuthenticated && token) {
      initializeLocalData(token).catch((error) => {
        console.error("Error initializing local data:", error);
      });

      syncAllUserData(token).catch((error) => {
        console.error("Error performing initial sync:", error);
      });
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    let intervalId = null;

    if (isAuthenticated && token) {
      intervalId = setInterval(() => {
        syncAllUserData(token).catch((error) => {
          console.error("Periodic sync failed:", error);
        });
      }, USER_SYNC_INTERVAL_MS);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, token]);

  return React.createElement(AuthContext.Provider, { value }, children);
};
