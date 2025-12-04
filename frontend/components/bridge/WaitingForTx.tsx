"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useBridgeStore } from "@/lib/store";
import { pollForZecTx, fetchZecTxData } from "@/lib/api";
import { REQUIRED_CONFIRMATIONS } from "@/lib/constants";
import { Clock, CheckCircle2 } from "lucide-react";

export function WaitingForTx() {
  const { amount, setTxid, setTxData, setStep, setError } = useBridgeStore();
  const [confirmations, setConfirmations] = useState(0);
  const [status, setStatus] = useState<"searching" | "confirming" | "fetching">("searching");

  const progressPercent = Math.min((confirmations / REQUIRED_CONFIRMATIONS) * 100, 100);

  const startPolling = useCallback(async () => {
    try {
      // Poll for transaction
      const txid = await pollForZecTx(amount, (confs) => {
        setConfirmations(confs);
        if (confs > 0) {
          setStatus("confirming");
        }
      });

      setTxid(txid);
      setStatus("fetching");

      // Fetch transaction data
      const txData = await fetchZecTxData(txid);
      console.log("Fetched TX data:", txData);
      setTxData(txData);

      // Move to proving step
      setStep("proving");
    } catch (error) {
      console.error("Error waiting for tx:", error);
      setError(error instanceof Error ? error.message : "Failed to detect transaction");
    }
  }, [amount, setTxid, setTxData, setStep, setError]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (mounted) {
        await startPolling();
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [startPolling]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          {status === "searching" ? (
            <>
              <Spinner size="sm" />
              Searching for Transaction
            </>
          ) : status === "confirming" ? (
            <>
              <Clock className="w-6 h-6 text-[#F4B728]" />
              Waiting for Confirmations
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              Fetching Transaction Data
            </>
          )}
        </CardTitle>
        <CardDescription>
          {status === "searching"
            ? "Looking for your ZEC transaction on the Zcash network..."
            : status === "confirming"
            ? `Your transaction needs ${REQUIRED_CONFIRMATIONS} confirmations`
            : "Preparing transaction data for proof generation..."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <Badge variant={confirmations >= REQUIRED_CONFIRMATIONS ? "success" : "secondary"}>
              {confirmations} / {REQUIRED_CONFIRMATIONS} confirmations
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>

        {/* Status indicators */}
        <div className="space-y-3">
          <StatusItem label="Transaction detected" completed={confirmations > 0} active={status === "searching"} />
          <StatusItem
            label="Confirmations received"
            completed={confirmations >= REQUIRED_CONFIRMATIONS}
            active={status === "confirming"}
          />
          <StatusItem
            label="Transaction data fetched"
            completed={status === "fetching"}
            active={status === "fetching"}
          />
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center p-4 bg-muted rounded-lg">
          <p>This may take 10-30 minutes depending on Zcash network conditions.</p>
          <p className="mt-1">Do not close this page.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, completed, active }: { label: string; completed: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center ${
          completed ? "bg-green-500 text-white" : active ? "bg-primary animate-pulse" : "bg-muted"
        }`}
      >
        {completed ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : active ? (
          <div className="w-2 h-2 bg-white rounded-full" />
        ) : (
          <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
        )}
      </div>
      <span
        className={`text-sm ${
          completed ? "text-foreground" : active ? "text-foreground font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
