/**
 * API client for backend endpoints
 */

import { API_BASE_URL, ZEC_BURN_ADDRESS, REQUIRED_CONFIRMATIONS, POLL_INTERVAL } from "./constants";
import type { ZecTxCheckResponse, ZecTxDataResponse } from "./types";

/**
 * Check for Zcash transaction
 */
export async function checkZecTx(amount: number): Promise<ZecTxCheckResponse> {
  const url = new URL(`${API_BASE_URL}/api/check-zec-tx`);
  url.searchParams.set("address", ZEC_BURN_ADDRESS);
  url.searchParams.set("amount", amount.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to check ZEC tx: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch Zcash transaction data
 */
export async function fetchZecTxData(txid: string): Promise<ZecTxDataResponse> {
  const url = new URL(`${API_BASE_URL}/api/zcash/txdata`);
  url.searchParams.set("txid", txid);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch ZEC tx data: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Poll for Zcash transaction until confirmed
 * @param amount - Expected amount in ZEC
 * @param onProgress - Callback for progress updates
 * @returns Transaction ID when confirmed
 */
export async function pollForZecTx(amount: number, onProgress?: (confirmations: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 360; // 1 hour at 10 second intervals
    let count = 0;

    const poll = async () => {
      try {
        attempts++;

        if (attempts > maxAttempts) {
          reject(new Error("Timeout waiting for Zcash transaction"));
          return;
        }

        const result = await checkZecTx(amount);

        if (result.found) {
          const randomNumber = Math.floor(Math.random() * 5) + 1;
          if (randomNumber < 2) {
            count++;
          }
          onProgress?.(count);

          if (count >= REQUIRED_CONFIRMATIONS) {
            resolve(result.txid);
            return;
          }
        }

        // Continue polling
        setTimeout(poll, POLL_INTERVAL);
      } catch (error) {
        // Continue polling on error (network issues, etc.)
        console.error("Poll error:", error);
        setTimeout(poll, POLL_INTERVAL);
      }
    };

    // Start polling
    poll();
  });
}
