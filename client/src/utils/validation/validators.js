import { INPUT_LIMITS, sanitizeTextInput } from "./inputSanitizers";
import { normalizePhoneInput } from "./phoneMask";

function assertNonEmptyString(value, errorMessage, minLength = 1) {
  if (typeof value !== "string" || value.length < minLength) {
    throw new Error(errorMessage);
  }
}

export function assertPhone(phone) {
  assertNonEmptyString(phone, "Invalid phone number", 1);
  if (!normalizePhoneInput(phone)) {
    throw new Error("Invalid phone number");
  }
}

export function assertLogin(login) {
  const normalized = sanitizeTextInput(login, {
    maxLength: INPUT_LIMITS.LOGIN,
    stripHtml: true,
  });
  assertNonEmptyString(normalized, "Invalid login", 1);
}

export function assertOtpCode(code) {
  const normalized = String(code ?? "").trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("Invalid code");
  }
}

export function assertNewPassword(newPassword) {
  if (typeof newPassword !== "string") {
    throw new Error("Invalid new password");
  }
  const normalized = newPassword.trim();
  if (!normalized || normalized.length > INPUT_LIMITS.PASSWORD) {
    throw new Error("Invalid new password");
  }
}
