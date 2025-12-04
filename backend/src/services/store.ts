/**
 * Transaction Store Service
 *
 * In-memory store for Zcash transactions submitted by the watcher.
 * The watcher monitors the Zcash blockchain and submits transaction
 * details when a transfer to the burn address is detected.
 */

import logger from "../config/logger.js";
import type { ZecTxDataResponse } from "../types/index.js";

// Transaction status
export type TransactionStatus = "pending" | "confirmed" | "processed";

// Stored transaction data
export interface StoredTransaction {
  txid: string;
  amount: number; // in zatoshis
  recipient: string; // Ethereum address from memo
  confirmations: number;
  status: TransactionStatus;
  txData: ZecTxDataResponse;
  createdAt: Date;
  updatedAt: Date;
}

// Input for submitting a new transaction from the watcher
export interface SubmitTransactionInput {
  txid: string;
  amount: number;
  recipient: string;
  confirmations: number;
  txData: ZecTxDataResponse;
}

// Input for updating confirmations
export interface UpdateConfirmationsInput {
  txid: string;
  confirmations: number;
}

class TransactionStore {
  // In-memory store - in production, use a database
  private transactions: Map<string, StoredTransaction> = new Map();

  // Index by recipient for quick lookups
  private byRecipient: Map<string, Set<string>> = new Map();

  // Index by amount for matching (amount in zatoshis -> Set of txids)
  private byAmount: Map<number, Set<string>> = new Map();

  /**
   * Submit a new transaction from the watcher
   */
  submit(input: SubmitTransactionInput): StoredTransaction {
    const { txid, amount, recipient, confirmations, txData } = input;

    // Check if already exists
    if (this.transactions.has(txid)) {
      logger.warn(`Transaction ${txid} already exists, updating instead`);
      return this.updateConfirmations({ txid, confirmations });
    }

    const now = new Date();
    const tx: StoredTransaction = {
      txid,
      amount,
      recipient: recipient.toLowerCase(),
      confirmations,
      status: confirmations >= 6 ? "confirmed" : "pending",
      txData,
      createdAt: now,
      updatedAt: now,
    };

    // Store transaction
    this.transactions.set(txid, tx);

    // Index by recipient
    const recipientLower = recipient.toLowerCase();
    if (!this.byRecipient.has(recipientLower)) {
      this.byRecipient.set(recipientLower, new Set());
    }
    this.byRecipient.get(recipientLower)!.add(txid);

    // Index by amount
    if (!this.byAmount.has(amount)) {
      this.byAmount.set(amount, new Set());
    }
    this.byAmount.get(amount)!.add(txid);

    logger.info(`Transaction submitted: ${txid} (${amount} zatoshis to ${recipient})`);

    return tx;
  }

  /**
   * Update confirmations for a transaction
   */
  updateConfirmations(input: UpdateConfirmationsInput): StoredTransaction {
    const { txid, confirmations } = input;

    const tx = this.transactions.get(txid);
    if (!tx) {
      throw new Error(`Transaction ${txid} not found`);
    }

    tx.confirmations = confirmations;
    tx.updatedAt = new Date();

    // Update status based on confirmations
    if (confirmations >= 6 && tx.status === "pending") {
      tx.status = "confirmed";
      logger.info(`Transaction ${txid} confirmed with ${confirmations} confirmations`);
    }

    return tx;
  }

  /**
   * Mark a transaction as processed (after bridge mint)
   */
  markProcessed(txid: string): StoredTransaction {
    const tx = this.transactions.get(txid);
    if (!tx) {
      throw new Error(`Transaction ${txid} not found`);
    }

    tx.status = "processed";
    tx.updatedAt = new Date();

    logger.info(`Transaction ${txid} marked as processed`);

    return tx;
  }

  /**
   * Get a transaction by txid
   */
  get(txid: string): StoredTransaction | undefined {
    return this.transactions.get(txid);
  }

  /**
   * Find transactions by recipient address
   */
  findByRecipient(recipient: string): StoredTransaction[] {
    const recipientLower = recipient.toLowerCase();
    const txids = this.byRecipient.get(recipientLower);

    if (!txids) {
      return [];
    }

    return Array.from(txids)
      .map((txid) => this.transactions.get(txid)!)
      .filter((tx) => tx !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Find transactions by amount (for frontend polling)
   */
  findByAmount(amount: number): StoredTransaction[] {
    const txids = this.byAmount.get(amount);

    if (!txids) {
      return [];
    }

    return Array.from(txids)
      .map((txid) => this.transactions.get(txid)!)
      .filter((tx) => tx !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Find a pending transaction for a specific amount (used by frontend polling)
   * Returns the most recent unprocessed transaction with matching amount
   */
  findPendingByAmount(amount: number): StoredTransaction | undefined {
    const transactions = this.findByAmount(amount);
    return transactions.find((tx) => tx.status !== "processed");
  }

  /**
   * Get all transactions
   */
  getAll(): StoredTransaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get pending transactions (not yet confirmed)
   */
  getPending(): StoredTransaction[] {
    return this.getAll().filter((tx) => tx.status === "pending");
  }

  /**
   * Get confirmed transactions (ready for processing)
   */
  getConfirmed(): StoredTransaction[] {
    return this.getAll().filter((tx) => tx.status === "confirmed");
  }

  /**
   * Delete a transaction (for cleanup)
   */
  delete(txid: string): boolean {
    const tx = this.transactions.get(txid);
    if (!tx) {
      return false;
    }

    // Remove from indexes
    const recipientSet = this.byRecipient.get(tx.recipient);
    if (recipientSet) {
      recipientSet.delete(txid);
      if (recipientSet.size === 0) {
        this.byRecipient.delete(tx.recipient);
      }
    }

    const amountSet = this.byAmount.get(tx.amount);
    if (amountSet) {
      amountSet.delete(txid);
      if (amountSet.size === 0) {
        this.byAmount.delete(tx.amount);
      }
    }

    // Remove from main store
    this.transactions.delete(txid);

    logger.info(`Transaction ${txid} deleted`);

    return true;
  }

  /**
   * Get store statistics
   */
  getStats(): {
    total: number;
    pending: number;
    confirmed: number;
    processed: number;
  } {
    const all = this.getAll();
    return {
      total: all.length,
      pending: all.filter((tx) => tx.status === "pending").length,
      confirmed: all.filter((tx) => tx.status === "confirmed").length,
      processed: all.filter((tx) => tx.status === "processed").length,
    };
  }

  /**
   * Clear all transactions (for testing)
   */
  clear(): void {
    this.transactions.clear();
    this.byRecipient.clear();
    this.byAmount.clear();
    logger.warn("Transaction store cleared");
  }
}

// Export singleton instance
export const transactionStore = new TransactionStore();
export default transactionStore;
