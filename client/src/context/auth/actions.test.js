import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../utils/apiClient", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("../../utils/syncUserData", () => ({
  clearLocalUserData: vi.fn(),
}));

import { apiPost } from "../../utils/apiClient";
import { clearLocalUserData } from "../../utils/syncUserData";
import { createAuthActions } from "./actions";
import { COOKIE_SESSION_TOKEN, STORAGE_AUTH_SESSION, STORAGE_USER } from "./constants";

describe("auth actions", () => {
  const setToken = vi.fn();
  const setUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("loginPassword persists session and user", async () => {
    const user = { id: 1, name: "Tester", phone: "+79991234567" };
    vi.mocked(apiPost).mockResolvedValue({ user });

    const actions = createAuthActions({ token: null, setToken, setUser });
    const result = await actions.loginPassword("tester", "password123");

    expect(result).toEqual({ user });
    expect(apiPost).toHaveBeenCalledWith(
      "/auth/login-password",
      { login: "tester", password: "password123" },
      expect.objectContaining({ schema: expect.any(Object) })
    );
    expect(setToken).toHaveBeenCalledWith(COOKIE_SESSION_TOKEN);
    expect(setUser).toHaveBeenCalledWith(user);
    expect(localStorage.getItem(STORAGE_AUTH_SESSION)).toBe("1");
    expect(localStorage.getItem(STORAGE_USER)).toBe(JSON.stringify(user));
  });

  it("logout clears session and local user data", async () => {
    vi.mocked(apiPost).mockResolvedValue({ ok: true });
    localStorage.setItem(STORAGE_AUTH_SESSION, "1");
    localStorage.setItem(STORAGE_USER, JSON.stringify({ id: 7 }));
    localStorage.setItem("prizeprice_favorites", JSON.stringify([1, 2]));

    const actions = createAuthActions({ token: COOKIE_SESSION_TOKEN, setToken, setUser });
    await actions.logout();

    expect(apiPost).toHaveBeenCalledWith(
      "/auth/logout",
      null,
      expect.objectContaining({ schema: expect.any(Object) })
    );
    expect(setToken).toHaveBeenCalledWith(null);
    expect(setUser).toHaveBeenCalledWith(null);
    expect(clearLocalUserData).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_AUTH_SESSION)).toBeNull();
    expect(localStorage.getItem(STORAGE_USER)).toBeNull();
  });
});

