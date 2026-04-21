import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRequired } from "../middlewares/auth.middleware.js";
import {
  me,
  setPassword,
  setEmail,
  setName,
  history,
  importHistory,
  clearHistory,
  deleteHistory,
  favorites,
  addFav,
  removeFav,
  clearFav,
  cart,
  addCart,
  removeCart,
  priceWatchList,
  priceWatchUpsert,
  priceWatchImport,
  priceWatchRemove,
  notifications,
  notificationRead,
  notificationReadAll,
  notificationDelete,
  optOutFromSms,
  cancelSmsOptOut,
} from "../controllers/me.controller.js";

export const meRouter = express.Router();

// all /me/* endpoints require JWT
meRouter.use(authRequired);

meRouter.get("/", asyncHandler(me));
meRouter.post("/password", asyncHandler(setPassword));
meRouter.post("/email", asyncHandler(setEmail));
meRouter.post("/name", asyncHandler(setName));

meRouter.get("/history", asyncHandler(history));
meRouter.post("/history/import", asyncHandler(importHistory));
meRouter.delete("/history", asyncHandler(clearHistory));
meRouter.delete("/history/:id", asyncHandler(deleteHistory));

meRouter.get("/favorites", asyncHandler(favorites));
meRouter.post("/favorites/:productId", asyncHandler(addFav));
meRouter.delete("/favorites/:productId", asyncHandler(removeFav));
meRouter.delete("/favorites", asyncHandler(clearFav));

meRouter.get("/cart", asyncHandler(cart));
meRouter.post("/cart/:productId", asyncHandler(addCart));
meRouter.delete("/cart/:productId", asyncHandler(removeCart));

meRouter.get("/price-watch", asyncHandler(priceWatchList));
meRouter.post("/price-watch", asyncHandler(priceWatchUpsert));
meRouter.post("/price-watch/import", asyncHandler(priceWatchImport));
meRouter.delete("/price-watch/:productId", asyncHandler(priceWatchRemove));

meRouter.get("/notifications", asyncHandler(notifications));
meRouter.post("/notifications/:id/read", asyncHandler(notificationRead));
meRouter.post("/notifications/read-all", asyncHandler(notificationReadAll));
meRouter.delete("/notifications/:id", asyncHandler(notificationDelete));

// SMS settings
meRouter.post("/sms-opt-out", asyncHandler(optOutFromSms));
meRouter.post("/sms-opt-in", asyncHandler(cancelSmsOptOut));
