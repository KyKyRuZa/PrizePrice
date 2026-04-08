import { signAccessToken } from "../../utils/session.js";
import { User } from "../../models/index.js";
import { normalizePhone } from "../../utils/index.js";
import { INPUT_LIMITS, isValidPhoneInput, sanitizeEmail, sanitizeUserName } from "../../utils/sanitize.js";

const PHONE_REGEX = /^\+7\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePhone(raw) {
  const input = String(raw ?? "").trim();
  if (!input || !isValidPhoneInput(input)) {
    return null;
  }

  const normalized = normalizePhone(input);
  return PHONE_REGEX.test(normalized) ? normalized : null;
}

export function isValidPhone(phone) {
  return PHONE_REGEX.test(String(phone || ""));
}

function resolveLoginLookup(rawInput) {
  const input = String(rawInput ?? "").trim();
  if (!input) return { input: "", kind: "invalid" };

  if (input.includes("@")) {
    const email = sanitizeEmail(input);
    if (EMAIL_REGEX.test(email)) {
      return { input: email, kind: "email" };
    }
  }

  const phone = parsePhone(input);
  if (phone) {
    return { input, kind: "phone", phone };
  }

  const username = sanitizeUserName(input, INPUT_LIMITS.DISPLAY_NAME);
  if (!username) return { input: "", kind: "invalid" };

  return { input: username, kind: "username" };
}

export async function findUserByLoginInput(rawInput) {
  const lookup = resolveLoginLookup(rawInput);

  if (lookup.kind === "email") {
    return User.findOne({ where: { email: lookup.input } });
  }

  if (lookup.kind === "phone") {
    return User.findOne({ where: { phone: lookup.phone } });
  }

  if (lookup.kind === "username") {
    return User.findOne({ where: { name: lookup.input } });
  }

  return null;
}

export function signAuthToken(userRec) {
  return signAccessToken(userRec);
}
