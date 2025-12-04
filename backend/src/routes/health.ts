/**
 * Health check routes
 */

import { Router, type Request, type Response, type IRouter } from "express";
import config from "../config/index.js";

const router: IRouter = Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

/**
 * GET /api/config
 * Get public configuration
 */
router.get("/config", (_req: Request, res: Response) => {
  res.json({
    burnAddress: config.bridge.burnAddress,
    requiredConfirmations: config.bridge.requiredConfirmations,
  });
});

export default router;
