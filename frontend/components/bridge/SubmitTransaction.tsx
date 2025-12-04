"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBridgeStore } from "@/lib/store";
import { bridgeMintFromZec } from "@/lib/contracts";
import { Send, ExternalLink, AlertCircle } from "lucide-react";

export function SubmitTransaction() {
  const { address } = useAccount();
  const { proof, publicInputs, encAmountObject, setEthTxHash, setStep, setError, error } = useBridgeStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const submitTransaction = useCallback(async () => {
    if (!address || !proof || !encAmountObject) {
      setError("Missing required data for transaction");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const txHash = await bridgeMintFromZec(
        proof,
        publicInputs,
        encAmountObject as { data: number[]; securityZone: number },
        address
      );

      setEthTxHash(txHash);
      setStep("success");
    } catch (err) {
      console.error("Transaction failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [address, proof, publicInputs, encAmountObject, setEthTxHash, setStep, setError]);

  // Auto-submit on mount
  useEffect(() => {
    if (!isSubmitting && !error && retryCount === 0) {
      submitTransaction();
    }
  }, [submitTransaction, isSubmitting, error, retryCount]);

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
    submitTransaction();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <Send className="w-6 h-6 text-[#627EEA]" />
          Submit to Ethereum
        </CardTitle>
        <CardDescription>Submitting your proof to the bridge contract on Ethereum Sepolia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Transaction Failed</AlertTitle>
              <AlertDescription className="text-xs mt-2">{error}</AlertDescription>
            </Alert>

            <Button onClick={handleRetry} className="w-full" variant="ethereum" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  <span className="ml-2">Retrying...</span>
                </>
              ) : (
                "Retry Transaction"
              )}
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#627EEA]/20 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="font-medium">Waiting for wallet confirmation</p>
              <p className="text-sm text-muted-foreground">Please confirm the transaction in your wallet</p>
            </div>

            <div className="text-xs text-muted-foreground text-center p-4 bg-muted rounded-lg w-full">
              <p>This will mint confidential FHZEC tokens to your address.</p>
              <p className="mt-1">Gas fees apply on Ethereum Sepolia.</p>
            </div>
          </div>
        )}

        {/* Etherscan link placeholder */}
        <div className="text-center">
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            View on Etherscan
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
