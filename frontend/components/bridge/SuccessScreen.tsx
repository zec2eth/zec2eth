"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBridgeStore } from "@/lib/store";
import { formatZec, formatTxHash } from "@/lib/utils";
import { CheckCircle2, ExternalLink, Copy, Check, PartyPopper } from "lucide-react";
import { useState } from "react";

export function SuccessScreen() {
  const { amount, ethTxHash, reset } = useBridgeStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ethTxHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleNewBridge = () => {
    reset();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
        </div>
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <PartyPopper className="w-6 h-6" />
          Transfer Complete!
        </CardTitle>
        <CardDescription>Your ZEC has been successfully converted to confidential FHZEC</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="bg-muted rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount Transferred</span>
            <span className="font-bold text-lg">{formatZec(amount)} ZEC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Received</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{formatZec(amount)} FHZEC</span>
              <Badge variant="success">Encrypted</Badge>
            </div>
          </div>
        </div>

        {/* Transaction hash */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Ethereum Transaction</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm truncate">
              {formatTxHash(ethTxHash, 16)}
            </div>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={`https://sepolia.etherscan.io/tx/${ethTxHash}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Info about FHZEC */}
        <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg border border-dashed">
          <p className="font-medium text-foreground mb-2">About your FHZEC tokens:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Your balance is encrypted using FHE (Fully Homomorphic Encryption)</li>
            <li>Only you can see your actual balance</li>
            <li>Transfers remain confidential on-chain</li>
            <li>The token is an FHERC20 on Ethereum Sepolia</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button onClick={handleNewBridge} variant="zcash" size="lg" className="w-full">
            Bridge More ZEC
          </Button>
          <Button variant="outline" size="lg" className="w-full" asChild>
            <a href={`https://sepolia.etherscan.io/tx/${ethTxHash}`} target="_blank" rel="noopener noreferrer">
              View on Etherscan
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
