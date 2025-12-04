"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { initFhe, reinitFhe, isFheInitialized, encryptAmount } from "@/lib/fhe";
import type { FheEncryptionResult } from "@/lib/types";

/**
 * Hook to manage CoFHE.js initialization and encryption
 * Automatically initializes when wallet is connected
 */
export function useFhe() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize FHE when wallet connects
  useEffect(() => {
    const initialize = async () => {
      if (!isConnected || !walletClient) {
        setIsInitialized(false);
        return;
      }

      setIsInitializing(true);
      setError(null);

      try {
        // Use wallet client as both provider and signer for CoFHE
        const success = await initFhe(walletClient, walletClient);
        setIsInitialized(success);

        if (!success) {
          console.log("CoFHE running in fallback mode");
        }
      } catch (err) {
        console.error("FHE initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize FHE");
        setIsInitialized(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [isConnected, walletClient]);

  // Re-initialize when wallet address changes
  useEffect(() => {
    const reinitialize = async () => {
      if (!address || !walletClient || !isFheInitialized()) {
        return;
      }

      try {
        await reinitFhe(walletClient, walletClient);
      } catch (err) {
        console.error("FHE re-initialization error:", err);
      }
    };

    reinitialize();
  }, [address, walletClient]);

  // Encrypt function with proper typing
  const encrypt = useCallback(async (amount: number): Promise<FheEncryptionResult> => {
    return encryptAmount(amount);
  }, []);

  return {
    isInitialized,
    isInitializing,
    error,
    encrypt,
    isFallbackMode: isConnected && !isInitializing && !isInitialized,
  };
}
