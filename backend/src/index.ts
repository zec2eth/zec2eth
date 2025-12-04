/**
 * Express.js Backend for ZEC to ETH Bridge
 *
 * Provides API endpoints for:
 * - Watcher to submit detected Zcash transactions
 * - Frontend to query transaction status and data
 * - Health checks
 */

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import config from "./config/index.js";
import logger from "./config/logger.js";
import routes from "./routes/index.js";

// Create Express app
const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Watcher-Secret"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing
app.use(express.json({ limit: "10mb" })); // Increased for tx_bytes
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Mount API routes
app.use("/api", routes);

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "ZEC to ETH Transfer API",
    version: "1.0.0",
    description: "Backend for ZEC to ETH confidential transfer",
    endpoints: {
      health: "/api/health",
      config: "/api/config",
      // Frontend endpoints
      checkZecTx: "/api/check-zec-tx?address=<address>&amount=<amount>",
      txData: "/api/zcash/txdata?txid=<txid>",
      txInfo: "/api/zcash/tx/:txid",
      confirmations: "/api/zcash/confirmations/:txid",
      transactions: "/api/transactions",
      transactionStats: "/api/transactions/stats",
      // Watcher endpoints
      watcherSubmit: "POST /api/watcher/submit",
      watcherUpdateConfirmations: "POST /api/watcher/update-confirmations",
      markProcessed: "POST /api/transactions/:txid/processed",
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: config.nodeEnv === "development" ? err.message : "Internal server error",
  });
});

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 Server running on http://localhost:${config.port}`);
  logger.info(`   Environment: ${config.nodeEnv}`);
  logger.info(`   CORS origin: ${config.corsOrigin}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

export default app;
