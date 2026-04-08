import { z } from "zod";

import { INPUT_LIMITS, isValidPhoneInput } from "../../utils/sanitize.js";

export const phoneInputSchema = z
  .string()
  .trim()
  .min(10)
  .max(INPUT_LIMITS.PHONE_INPUT)
  .refine((value) => isValidPhoneInput(value), {
    message: "INVALID_PHONE_FORMAT",
  });

export const loginInputSchema = z.string().trim().min(1).max(INPUT_LIMITS.LOGIN);
export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/);
export const passwordInputSchema = z.string().min(1).max(INPUT_LIMITS.PASSWORD);
export const usernameInputSchema = z.string().trim().min(3).max(INPUT_LIMITS.USERNAME);
