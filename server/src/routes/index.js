import express from "express";

import { authRouter } from "./auth.routes.js";
import { productsRouter } from "./products.routes.js";
import { meRouter } from "./me.routes.js";
import { debugRouter } from "./debug.routes.js";

export const apiRouter = express.Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/me", meRouter);
apiRouter.use("/debug", debugRouter);
