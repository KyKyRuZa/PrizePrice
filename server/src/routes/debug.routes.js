import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { setOfferPrice } from "../controllers/debug.controller.js";

export const debugRouter = express.Router();

debugRouter.post("/set-offer-price", asyncHandler(setOfferPrice));
