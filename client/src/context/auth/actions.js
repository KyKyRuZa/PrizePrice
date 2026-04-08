import { apiGet, apiPost } from "../../utils/apiClient";
import { clearLocalUserData } from "../../utils/syncUserData";
import { INPUT_LIMITS, sanitizeTextInput } from "../../utils/inputSanitizers";
import { normalizePhoneInput } from "../../utils/phoneMask";
import { assertLogin, assertNewPassword, assertOtpCode, assertPhone } from "./validators";
import { COOKIE_SESSION_TOKEN } from "./constants";
import { clearStoredSession, saveSessionFlag, saveUser } from "./storage";
import {
  authSuccessSchema,
  okResponseSchema,
  otpRequestedSchema,
  resetPasswordSuccessSchema,
  userDataPayloadSchema,
  userResponseSchema,
} from "../../contracts/apiSchemas";

function createApiError(code, data) {
  const error = new Error(code);
  error.data = data;
  return error;
}

function persistAuthSession(data, { setToken, setUser }) {
  setToken(COOKIE_SESSION_TOKEN);
  saveSessionFlag();

  if (data?.user) {
    setUser(data.user);
    saveUser(data.user);
  }
}

function normalizeLogin(login) {
  return sanitizeTextInput(login, { maxLength: INPUT_LIMITS.LOGIN, stripHtml: true });
}

function normalizePhone(phone) {
  return normalizePhoneInput(phone);
}

export function createAuthActions({ token, setToken, setUser }) {
  const applySession = (data) => persistAuthSession(data, { setToken, setUser });

  return {
    async requestCode(phone) {
      const normalizedPhone = normalizePhone(phone);
      assertPhone(normalizedPhone || phone);
      return apiPost("/auth/request-code", { phone: normalizedPhone }, { schema: otpRequestedSchema });
    },

    async requestCodeForLogin(login) {
      return apiPost(
        "/auth/request-login-code",
        { login: normalizeLogin(login) },
        { schema: otpRequestedSchema }
      );
    },

    async verifyCode(phone, code) {
      assertPhone(phone);
      assertOtpCode(code);

      const data = await apiPost("/auth/verify-code", {
        phone: normalizePhone(phone),
        code: String(code).trim(),
      }, { schema: authSuccessSchema });
      applySession(data);
      return data;
    },

    async verifyLoginWithOtp(login, code) {
      assertLogin(login);
      assertOtpCode(code);

      const data = await apiPost("/auth/verify-login-with-otp", {
        login: normalizeLogin(login),
        code: String(code).trim(),
      }, { schema: authSuccessSchema });
      applySession(data);
      return data;
    },

    async loginPassword(login, password) {
      const data = await apiPost("/auth/login-password", {
        login: normalizeLogin(login),
        password: String(password ?? "").slice(0, INPUT_LIMITS.PASSWORD),
      }, { schema: authSuccessSchema });
      applySession(data);
      return data;
    },

    async requestCodeForRegistration(username, phone, password, passwordConfirmation) {
      return apiPost(
        "/auth/request-registration-code",
        {
          username: sanitizeTextInput(username, { maxLength: INPUT_LIMITS.USERNAME, stripHtml: true }),
          phone: normalizePhone(phone),
          password: String(password ?? "").slice(0, INPUT_LIMITS.PASSWORD),
          passwordConfirmation: String(passwordConfirmation ?? "").slice(0, INPUT_LIMITS.PASSWORD),
        },
        { schema: otpRequestedSchema }
      );
    },

    async registerWithCode(phone, code) {
      assertPhone(phone);
      assertOtpCode(code);

      const data = await apiPost("/auth/register-with-code", {
        phone: normalizePhone(phone),
        code: String(code).trim(),
      }, { schema: authSuccessSchema });
      applySession(data);
      return data;
    },

    async registerWithUsername(username, phone, password) {
      const data = await apiPost("/auth/register", {
        username: sanitizeTextInput(username, { maxLength: INPUT_LIMITS.USERNAME, stripHtml: true }),
        phone: normalizePhone(phone),
        password: String(password ?? "").slice(0, INPUT_LIMITS.PASSWORD),
        passwordConfirmation: String(password ?? "").slice(0, INPUT_LIMITS.PASSWORD),
      }, { schema: authSuccessSchema });
      applySession(data);
      return data;
    },

    async requestPasswordReset(phone) {
      const normalizedPhone = normalizePhone(phone);
      assertPhone(normalizedPhone || phone);
      return apiPost("/auth/request-reset", { phone: normalizedPhone }, { schema: otpRequestedSchema });
    },

    async resetPasswordWithOtp(phone, code, newPassword) {
      assertPhone(phone);
      assertOtpCode(code);
      assertNewPassword(newPassword);

      const data = await apiPost("/auth/reset-password", {
        phone: normalizePhone(phone),
        code: String(code).trim(),
        newPassword: String(newPassword ?? "").slice(0, INPUT_LIMITS.PASSWORD),
      }, { schema: resetPasswordSuccessSchema });
      if (!data?.ok) {
        throw createApiError("RESET_FAILED", data);
      }
      return data;
    },

    async setName(name) {
      const data = await apiPost(
        "/me/name",
        {
          name: sanitizeTextInput(name, { maxLength: INPUT_LIMITS.DISPLAY_NAME, stripHtml: true }),
        },
        { token, schema: userResponseSchema }
      );
      if (!data?.user) {
        throw createApiError("NO_USER_DATA", data);
      }

      setUser(data.user);
      saveUser(data.user);
      return data;
    },

    async updateUserData(userData) {
      return apiPost("/auth/user-data", userData, { token, schema: okResponseSchema });
    },

    async getUserData() {
      return apiGet("/auth/user-data", { token, schema: userDataPayloadSchema });
    },

    async logout() {
      try {
        await apiPost("/auth/logout", null, { schema: okResponseSchema });
      } catch {
        // Ignore network/logout endpoint errors on client-side logout.
      }

      setToken(null);
      setUser(null);
      clearStoredSession();
      clearLocalUserData();
    },
  };
}
