import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { authRequired } from "../middlewares/auth.middleware.js";
import {
  authRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
} from "../middlewares/rateLimit.middleware.js";
import {
  requestCode,
  verifyOtp,
  requestCodeForLogin,
  loginPassword,
  verifyLoginWithOtp,
  requestCodeForRegistration,
  registerWithCode,
  registerWithUsername,
  refreshSession,
  logoutSession,
  getUserData,
  updateUserData,
  requestPasswordReset,
  resetPasswordWithOtp,
} from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/request-code", otpRateLimiter, asyncHandler(requestCode));
authRouter.post("/verify-code", authRateLimiter, asyncHandler(verifyOtp));

authRouter.post("/request-login-code", otpRateLimiter, asyncHandler(requestCodeForLogin));
authRouter.post("/verify-login-with-otp", authRateLimiter, asyncHandler(verifyLoginWithOtp));
authRouter.post("/login-password", authRateLimiter, asyncHandler(loginPassword));

authRouter.post("/request-registration-code", otpRateLimiter, asyncHandler(requestCodeForRegistration));
authRouter.post("/register-with-code", authRateLimiter, asyncHandler(registerWithCode));
authRouter.post("/register", authRateLimiter, asyncHandler(registerWithUsername));

authRouter.post("/refresh", asyncHandler(refreshSession));
authRouter.post("/logout", asyncHandler(logoutSession));

authRouter.get("/user-data", authRequired, asyncHandler(getUserData));
authRouter.post("/user-data", authRequired, asyncHandler(updateUserData));

authRouter.post("/request-reset", passwordResetRateLimiter, asyncHandler(requestPasswordReset));
authRouter.post("/reset-password", passwordResetRateLimiter, asyncHandler(resetPasswordWithOtp));
