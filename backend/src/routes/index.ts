/**
 * Route exports
 */

import { Router, type IRouter } from "express";
import transactionRoutes from "./transactions.js";
import healthRoutes from "./health.js";

const router: IRouter = Router();

// Mount routes
router.use(transactionRoutes);
router.use(healthRoutes);

export default router;
