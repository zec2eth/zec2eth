"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useBridgeStore } from "@/lib/store";
import { ConnectWallet } from "./ConnectWallet";
import { AmountInput } from "./AmountInput";
import { BurnAddress } from "./BurnAddress";
import { WaitingForTx } from "./WaitingForTx";
import { ProofGeneration } from "./ProofGeneration";
import { SubmitTransaction } from "./SubmitTransaction";
import { SuccessScreen } from "./SuccessScreen";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { XCircle, RotateCcw } from "lucide-react";

export function BridgeFlow() {
  const { address, isConnected } = useAccount();
  const { step, setStep, setWalletAddress, error, setError, reset } = useBridgeStore();

  // Update wallet address and step when connection changes
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
      if (step === "connect") {
        setStep("amount");
      }
    } else {
      setWalletAddress("");
      setStep("connect");
    }
  }, [isConnected, address, step, setWalletAddress, setStep]);

  // Handle global error display
  if (error && step !== "submitting") {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setError(null)}>
            Dismiss
          </Button>
          <Button variant="destructive" className="flex-1" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  // Render current step
  switch (step) {
    case "connect":
      return <ConnectWallet />;
    case "amount":
      return <AmountInput />;
    case "burn":
      return <BurnAddress />;
    case "waiting":
      return <WaitingForTx />;
    case "proving":
      return <ProofGeneration />;
    case "submitting":
      return <SubmitTransaction />;
    case "success":
      return <SuccessScreen />;
    default:
      return <ConnectWallet />;
  }
}
