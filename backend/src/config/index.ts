/**
 * Configuration module
 */

import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Watcher authentication
  watcher: {
    secret: process.env.WATCHER_SECRET || "dev-secret-change-in-production",
  },

  // Bridge
  bridge: {
    burnAddress: process.env.ZEC_BURN_ADDRESS || "",
    burnScriptHash: process.env.BURN_SCRIPT_HASH || "",
    requiredConfirmations: parseInt(process.env.REQUIRED_CONFIRMATIONS || "6", 10),
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },
};

export default config;
