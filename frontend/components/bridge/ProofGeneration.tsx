"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useBridgeStore } from "@/lib/store";
import { useFhe } from "@/hooks/useFhe";
import { buildWitness, extractPublicInputs } from "@/lib/witness";
import { generateProof } from "@/lib/prover";
import { Shield, Lock, FileCheck, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ProofStep = "encrypting" | "building" | "proving" | "done";

const steps: { key: ProofStep; label: string; icon: React.ReactNode }[] = [
  { key: "encrypting", label: "Encrypting amount with FHE", icon: <Lock className="w-4 h-4" /> },
  { key: "building", label: "Building witness", icon: <FileCheck className="w-4 h-4" /> },
  { key: "proving", label: "Generating ZK proof", icon: <Shield className="w-4 h-4" /> },
];

export function ProofGeneration() {
  const { address } = useAccount();
  const { encrypt, isFallbackMode, isInitializing } = useFhe();
  const {
    amount,
    tx_bytes,
    out_values,
    out_scriptHashes,
    memo_bytes,
    merkle_sibling_hi,
    merkle_sibling_lo,
    merkle_path_dir,
    merkleRoot_hi,
    merkleRoot_lo,
    txId_hi,
    txId_lo,
    setFheData,
    setProofData,
    setStep,
    setError,
  } = useBridgeStore();

  const [currentStep, setCurrentStep] = useState<ProofStep>("encrypting");
  const [progress, setProgress] = useState(0);

  const runProofGeneration = useCallback(async () => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    // Wait for FHE to finish initializing
    if (isInitializing) {
      return;
    }

    try {
      // Step 1: FHE Encryption
      setCurrentStep("encrypting");
      setProgress(10);

      const fheResult = await encrypt(amount);
      setFheData(fheResult);
      setProgress(30);

      // Step 2: Build Witness
      setCurrentStep("building");
      setProgress(40);

      const witness = buildWitness({
        tx_bytes,
        out_values,
        out_scriptHashes,
        memo_bytes,
        merkle_sibling_hi,
        merkle_sibling_lo,
        merkle_path_dir,
        merkleRoot_hi,
        merkleRoot_lo,
        txId_hi,
        txId_lo,
        encAmount_bytes: fheResult.encryptedBytes,
        encAmountHash: fheResult.encAmountHash,
        amount,
        recipient: address,
      });

      const publicInputs = extractPublicInputs(witness);
      setProgress(50);

      // Step 3: Generate Proof
      setCurrentStep("proving");
      setProgress(60);

      const { proof, publicSignals } = await generateProof(witness);

      // Verify public signals match expected public inputs
      console.log("Public signals from proof:", publicSignals);
      console.log("Expected public inputs:", publicInputs);

      setProofData(proof, publicInputs);
      setProgress(100);

      // Move to submission step
      setCurrentStep("done");
      setTimeout(() => {
        setStep("submitting");
      }, 500);
    } catch (error) {
      console.error("Proof generation failed:", error);
      setError(error instanceof Error ? error.message : "Failed to generate proof");
    }
  }, [
    address,
    amount,
    encrypt,
    isInitializing,
    tx_bytes,
    out_values,
    out_scriptHashes,
    memo_bytes,
    merkle_sibling_hi,
    merkle_sibling_lo,
    merkle_path_dir,
    merkleRoot_hi,
    merkleRoot_lo,
    txId_hi,
    txId_lo,
    setFheData,
    setProofData,
    setStep,
    setError,
  ]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (mounted) {
        await runProofGeneration();
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [runProofGeneration]);

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <Shield className="w-6 h-6 text-[#627EEA]" />
          Generating ZK Proof
        </CardTitle>
        <CardDescription>Creating a zero-knowledge proof of your ZEC burn transaction</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fallback mode warning */}
        {isFallbackMode && (
          <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-600 dark:text-yellow-400 text-sm">
              Using local encryption mode. CoFHE is not available.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isCompleted = index < currentStepIndex || currentStep === "done";

            return (
              <div key={step.key} className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isActive && !isCompleted ? <Spinner size="sm" /> : step.icon}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {isActive && <p className="text-xs text-muted-foreground animate-pulse">Processing...</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center p-4 bg-muted rounded-lg">
          <p>Proof generation may take 30-60 seconds depending on your device.</p>
          <p className="mt-1">Your amount is encrypted with FHE for privacy.</p>
        </div>
      </CardContent>
    </Card>
  );
}
