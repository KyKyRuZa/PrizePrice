import { captureClientException } from "../observability/errorTracker";

const normalizeBase = (base) => {
  if (!base) return "";
  return String(base).replace(/\/$/, "");
};

export const API_BASE_URL = normalizeBase(import.meta.env.VITE_API_BASE_URL);

const buildUrl = (path) => {
  const p = String(path || "");
  const withSlash = p.startsWith("/") ? p : `/${p}`;

  if (API_BASE_URL) {
    return `${API_BASE_URL}/api${withSlash}`;
  }

  return `/api${withSlash}`;
};

function isJwtToken(token) {
  if (typeof token !== "string") return false;
  return token.split(".").length === 3;
}

function shouldSkipRefresh(path) {
  const normalized = String(path || "").split("?")[0];
  const blocked = new Set([
    "/auth/refresh",
    "/auth/request-code",
    "/auth/request-login-code",
    "/auth/verify-code",
    "/auth/verify-login-with-otp",
    "/auth/login-password",
    "/auth/request-registration-code",
    "/auth/register-with-code",
    "/auth/register",
    "/auth/request-reset",
    "/auth/reset-password",
    "/auth/logout",
  ]);
  return blocked.has(normalized);
}

let refreshPromise = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl("/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function performRequest(path, { method = "GET", token, body } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (isJwtToken(token)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { res, data };
}

export async function apiRequest(path, opts = {}) {
  const {
    method = "GET",
    token,
    body,
    schema,
    _retryAfterRefresh = false,
  } = opts;

  try {
    const { res, data } = await performRequest(path, { method, token, body });

    if (res.status === 401 && !_retryAfterRefresh && !shouldSkipRefresh(path)) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return apiRequest(path, { ...opts, _retryAfterRefresh: true });
      }
    }

    if (!res.ok) {
      const err = new Error(`API_ERROR: ${res.status} - ${res.statusText}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    if (schema && typeof schema.safeParse === "function") {
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        const details = (parsed.error?.issues || [])
          .map((issue) => {
            const pathInfo = Array.isArray(issue.path) && issue.path.length ? issue.path.join(".") : "<root>";
            return `${pathInfo}: ${issue.message}`;
          })
          .join("; ");
        const err = new Error(`API_CONTRACT_ERROR: ${method} ${path} -> ${details}`);
        err.status = res.status;
        err.data = data;
        err.contractIssues = parsed.error?.issues || [];
        throw err;
      }
      return parsed.data;
    }

    return data;
  } catch (error) {
    const responseStatus = Number(error?.status);
    const responseData = error?.data && typeof error.data === "object" ? error.data : null;
    const requestId = responseData?.requestId;
    const isContractError = String(error?.message || "").startsWith("API_CONTRACT_ERROR:");
    const isServerError = Number.isFinite(responseStatus) && responseStatus >= 500;
    const isNetworkError = !Number.isFinite(responseStatus);

    if (isContractError || isServerError || isNetworkError) {
      captureClientException(error, {
        level: isServerError ? "error" : "warning",
        tags: {
          source: "api_client",
          method,
          path: String(path || ""),
          status: Number.isFinite(responseStatus) ? responseStatus : "network",
          requestId: requestId || undefined,
        },
        extra: {
          requestId,
          response: responseData,
          contractIssues: error?.contractIssues || undefined,
        },
      });
    }

    if (typeof error?.status !== "number") {
      console.error(`Network error during API request: ${method} ${path}`, error);
    }
    throw error;
  }
}

export const apiGet = (path, opts = {}) => apiRequest(path, { ...opts, method: "GET" });
export const apiPost = (path, body, opts = {}) => apiRequest(path, { ...opts, method: "POST", body });
export const apiDelete = (path, opts = {}) => apiRequest(path, { ...opts, method: "DELETE" });
export const apiPatch = (path, body, opts = {}) => apiRequest(path, { ...opts, method: "PATCH", body });
export const apiPut = (path, body, opts = {}) => apiRequest(path, { ...opts, method: "PUT", body });
