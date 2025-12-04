"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBridgeStore } from "@/lib/store";
import { formatZec, truncateAddress } from "@/lib/utils";
import { Copy, Check, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";

export function BurnAddress() {
  const { burnAddress, amount, setStep } = useBridgeStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(burnAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSent = () => {
    setStep("waiting");
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Send ZEC to Burn Address</CardTitle>
        <CardDescription>
          Send exactly <span className="font-bold">{formatZec(amount)} ZEC</span> to the address below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-lg">
            <QRCodeSVG value={`zcash:${burnAddress}?amount=${amount}`} size={200} level="M" />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Burn Address (Unified)</label>
          <div className="relative">
            <div className="p-3 bg-muted rounded-lg text-xs font-mono break-all pr-12">{burnAddress}</div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">Shortened: {truncateAddress(burnAddress, 12)}</p>
        </div>

        {/* Warning */}
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription className="text-xs">
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Send exactly {formatZec(amount)} ZEC</li>
              <li>Use a shielded (unified) address to send</li>
              <li>Transaction requires 6 confirmations</li>
              <li>Funds sent to this address are non-recoverable</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Action */}
        <Button onClick={handleSent} className="w-full" variant="zcash" size="lg">
          I have sent the ZEC
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
