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

describe("auth actions", () => {
  const setUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("loginPassword persists user", async () => {
    const user = { id: 1, name: "Tester", phone: "+79991234567" };
    vi.mocked(apiPost).mockResolvedValue({ user });

    const actions = createAuthActions({ setUser });
    const result = await actions.loginPassword("tester", "password123");

    expect(result).toEqual({ user });
    expect(apiPost).toHaveBeenCalledWith(
      "/auth/login-password",
      { login: "tester", password: "password123" },
      expect.objectContaining({ schema: expect.any(Object) })
    );
    expect(setUser).toHaveBeenCalledWith(user);
  });

  it("logout clears session and local user data", async () => {
    vi.mocked(apiPost).mockResolvedValue({ ok: true });
    localStorage.setItem("prizeprice_favorites", JSON.stringify([1, 2]));

    const actions = createAuthActions({ setUser });
    await actions.logout();

    expect(apiPost).toHaveBeenCalledWith(
      "/auth/logout",
      null,
      expect.objectContaining({ schema: expect.any(Object) })
    );
    expect(setUser).toHaveBeenCalledWith(null);
    expect(clearLocalUserData).toHaveBeenCalledTimes(1);
  });
});
