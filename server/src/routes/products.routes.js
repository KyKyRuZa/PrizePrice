import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authOptional } from "../middlewares/auth.middleware.js";
import { categories, recommended, search, byId, priceHistory, categoryCounts } from "../controllers/products.controller.js";

export const productsRouter = express.Router();

productsRouter.get("/categories", asyncHandler(categories));
productsRouter.get("/category-counts", asyncHandler(categoryCounts));
productsRouter.get("/recommended", asyncHandler(recommended));
productsRouter.get("/search", authOptional, asyncHandler(search));
productsRouter.get("/:id", asyncHandler(byId));
productsRouter.get("/:id/price-history", asyncHandler(priceHistory));
