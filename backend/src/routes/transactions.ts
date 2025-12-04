/**
 * Transaction API routes
 *
 * Routes for:
 * - Watcher to submit transactions
 * - Frontend to query transactions
 */

import { Router, type Request, type Response, type IRouter } from "express";
import { transactionStore, type SubmitTransactionInput } from "../services/store.js";
import config from "../config/index.js";
import logger from "../config/logger.js";
import type { ZecTxDataResponse } from "../types/index.js";

const router: IRouter = Router();

/**
 * POST /api/watcher/submit
 * Submit a new transaction from the watcher
 *
 * Body:
 *   - txid: string (64 hex characters)
 *   - amount: number (in zatoshis)
 *   - recipient: string (Ethereum address)
 *   - confirmations: number
 *   - txData: ZecTxDataResponse
 *
 * Headers:
 *   - X-Watcher-Secret: Secret key for authentication
 */
router.post("/watcher/submit", async (req: Request, res: Response) => {
  try {
    // Validate watcher secret
    const watcherSecret = req.headers["x-watcher-secret"];
    if (watcherSecret !== config.watcher.secret) {
      logger.warn("Invalid watcher secret");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { txid, amount, recipient, confirmations, txData } = req.body;

    // Validate required fields
    if (!txid || typeof txid !== "string") {
      res.status(400).json({ error: "Missing or invalid txid" });
      return;
    }

    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      res.status(400).json({ error: "Invalid txid format" });
      return;
    }

    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "Missing or invalid amount" });
      return;
    }

    if (!recipient || typeof recipient !== "string") {
      res.status(400).json({ error: "Missing or invalid recipient" });
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      res.status(400).json({ error: "Invalid Ethereum address format" });
      return;
    }

    if (typeof confirmations !== "number" || confirmations < 0) {
      res.status(400).json({ error: "Missing or invalid confirmations" });
      return;
    }

    if (!txData || typeof txData !== "object") {
      res.status(400).json({ error: "Missing or invalid txData" });
      return;
    }

    // Validate txData structure
    const requiredFields = [
      "tx_bytes",
      "memo_bytes",
      "out_values",
      "out_scriptHashes",
      "merkle_sibling_hi",
      "merkle_sibling_lo",
      "merkle_path_dir",
      "merkleRoot_hi",
      "merkleRoot_lo",
      "txId_hi",
      "txId_lo",
    ];

    for (const field of requiredFields) {
      if (!(field in txData)) {
        res.status(400).json({ error: `Missing txData.${field}` });
        return;
      }
    }

    const input: SubmitTransactionInput = {
      txid,
      amount,
      recipient,
      confirmations,
      txData: txData as ZecTxDataResponse,
    };

    const tx = transactionStore.submit(input);

    logger.info(`Watcher submitted transaction: ${txid}`);

    res.status(201).json({
      success: true,
      transaction: {
        txid: tx.txid,
        amount: tx.amount,
        recipient: tx.recipient,
        confirmations: tx.confirmations,
        status: tx.status,
      },
    });
  } catch (error) {
    logger.error("Error in /api/watcher/submit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/watcher/update-confirmations
 * Update confirmations for a transaction
 *
 * Body:
 *   - txid: string
 *   - confirmations: number
 */
router.post("/watcher/update-confirmations", async (req: Request, res: Response) => {
  try {
    // Validate watcher secret
    const watcherSecret = req.headers["x-watcher-secret"];
    if (watcherSecret !== config.watcher.secret) {
      logger.warn("Invalid watcher secret");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { txid, confirmations } = req.body;

    if (!txid || typeof txid !== "string") {
      res.status(400).json({ error: "Missing or invalid txid" });
      return;
    }

    if (typeof confirmations !== "number" || confirmations < 0) {
      res.status(400).json({ error: "Missing or invalid confirmations" });
      return;
    }

    const tx = transactionStore.updateConfirmations({ txid, confirmations });

    res.json({
      success: true,
      transaction: {
        txid: tx.txid,
        confirmations: tx.confirmations,
        status: tx.status,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    logger.error("Error in /api/watcher/update-confirmations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/check-zec-tx
 * Check for a Zcash transaction with specific amount
 * Used by frontend for polling
 *
 * Query params:
 *   - address: Burn address (validated against config)
 *   - amount: Expected amount in ZEC
 *
 * Response:
 *   - found: boolean
 *   - confirmations: number
 *   - txid: string
 */
router.get("/check-zec-tx", async (req: Request, res: Response) => {
  try {
    const { address, amount } = req.query;

    if (!address || typeof address !== "string") {
      res.status(400).json({ error: "Missing or invalid address parameter" });
      return;
    }

    if (!amount || isNaN(Number(amount))) {
      res.status(400).json({ error: "Missing or invalid amount parameter" });
      return;
    }

    // Validate that the address matches our burn address
    if (address !== config.bridge.burnAddress) {
      res.status(400).json({ error: "Invalid burn address" });
      return;
    }

    const amountZec = parseFloat(amount as string);

    if (amountZec <= 0) {
      res.status(400).json({ error: "Amount must be positive" });
      return;
    }

    // Convert to zatoshis
    const amountZatoshis = Math.round(amountZec * 100_000_000);

    logger.debug(`Checking for ZEC tx: amount=${amountZec} ZEC (${amountZatoshis} zatoshis)`);

    // Find pending transaction with matching amount
    const tx = transactionStore.findPendingByAmount(amountZatoshis);

    if (tx) {
      res.json({
        found: true,
        confirmations: tx.confirmations,
        txid: tx.txid,
      });
    } else {
      res.json({
        found: false,
        confirmations: 0,
        txid: "",
      });
    }
  } catch (error) {
    logger.error("Error in /api/check-zec-tx:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/zcash/txdata
 * Get full transaction data for circuit input
 *
 * Query params:
 *   - txid: Transaction ID
 */
router.get("/zcash/txdata", async (req: Request, res: Response) => {
  try {
    const { txid } = req.query;

    if (!txid || typeof txid !== "string") {
      res.status(400).json({ error: "Missing or invalid txid parameter" });
      return;
    }

    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      res.status(400).json({ error: "Invalid txid format" });
      return;
    }

    logger.debug(`Fetching transaction data for: ${txid}`);

    const tx = transactionStore.get(txid);

    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    if (tx.confirmations < config.bridge.requiredConfirmations) {
      res.status(400).json({
        error: "Transaction not sufficiently confirmed",
        confirmations: tx.confirmations,
        required: config.bridge.requiredConfirmations,
      });
      return;
    }

    res.json(tx.txData);
  } catch (error) {
    logger.error("Error in /api/zcash/txdata:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/zcash/tx/:txid
 * Get transaction info
 */
router.get("/zcash/tx/:txid", async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;

    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      res.status(400).json({ error: "Invalid txid format" });
      return;
    }

    const tx = transactionStore.get(txid);

    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    res.json({
      txid: tx.txid,
      amount: tx.amount,
      recipient: tx.recipient,
      confirmations: tx.confirmations,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error("Error in /api/zcash/tx:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/zcash/confirmations/:txid
 * Get confirmation count for a transaction
 */
router.get("/zcash/confirmations/:txid", async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;

    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      res.status(400).json({ error: "Invalid txid format" });
      return;
    }

    const tx = transactionStore.get(txid);

    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    res.json({ txid, confirmations: tx.confirmations });
  } catch (error) {
    logger.error("Error in /api/zcash/confirmations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/transactions
 * Get all transactions (for admin/debugging)
 */
router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const { status, recipient, limit } = req.query;

    let transactions = transactionStore.getAll();

    // Filter by status
    if (status && typeof status === "string") {
      transactions = transactions.filter((tx) => tx.status === status);
    }

    // Filter by recipient
    if (recipient && typeof recipient === "string") {
      transactions = transactionStore.findByRecipient(recipient);
    }

    // Limit results
    const limitNum = limit ? parseInt(limit as string, 10) : 100;
    transactions = transactions.slice(0, limitNum);

    res.json({
      count: transactions.length,
      transactions: transactions.map((tx) => ({
        txid: tx.txid,
        amount: tx.amount,
        recipient: tx.recipient,
        confirmations: tx.confirmations,
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("Error in /api/transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/stats
 * Get transaction statistics
 */
router.get("/transactions/stats", async (_req: Request, res: Response) => {
  try {
    const stats = transactionStore.getStats();
    res.json(stats);
  } catch (error) {
    logger.error("Error in /api/transactions/stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/transactions/:txid/processed
 * Mark a transaction as processed (after bridge mint)
 */
router.post("/transactions/:txid/processed", async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;

    // This could require authentication in production
    const watcherSecret = req.headers["x-watcher-secret"];
    if (watcherSecret !== config.watcher.secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      res.status(400).json({ error: "Invalid txid format" });
      return;
    }

    const tx = transactionStore.markProcessed(txid);

    res.json({
      success: true,
      transaction: {
        txid: tx.txid,
        status: tx.status,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    logger.error("Error in /api/transactions/:txid/processed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
