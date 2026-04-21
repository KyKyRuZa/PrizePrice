import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiGet } from "./apiClient";

function createFetchResponse({ status = 200, statusText = "OK", body = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: vi.fn(async () => (body == null ? "" : JSON.stringify(body))),
  };
}

describe("apiClient refresh flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes session on 401 and retries original request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      vi.fn()
        .mockResolvedValueOnce(createFetchResponse({ status: 401, statusText: "Unauthorized", body: { error: "UNAUTHORIZED" } }))
        .mockResolvedValueOnce(createFetchResponse({ status: 200, body: { ok: true } }))
        .mockResolvedValueOnce(createFetchResponse({ status: 200, body: { user: { id: 1 } } }))
    );

    const data = await apiGet("/me");

    expect(data).toEqual({ user: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/me");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
    expect(fetchMock.mock.calls[2][0]).toBe("/api/me");
  });

  it("throws when refresh fails and original request remains unauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      vi.fn()
        .mockResolvedValueOnce(createFetchResponse({ status: 401, statusText: "Unauthorized", body: { error: "UNAUTHORIZED" } }))
        .mockResolvedValueOnce(createFetchResponse({ status: 401, statusText: "Unauthorized", body: { error: "UNAUTHORIZED" } }))
    );

    await expect(apiGet("/me")).rejects.toMatchObject({
      status: 401,
      data: { error: "UNAUTHORIZED" },
    });
  });
});

