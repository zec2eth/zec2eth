"use client";

import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export function ConnectWallet() {
  const { isConnecting } = useAccount();

  // Safe to use hook here since component only renders after Providers mount
  let openModal: (() => void) | undefined;
  try {
    const appKit = useAppKit();
    openModal = appKit.open;
  } catch {
    // AppKit not initialized yet
  }

  const handleConnect = () => {
    if (openModal) {
      openModal();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
        <CardDescription>Connect your Ethereum wallet to start bridging ZEC</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#F4B728] to-[#627EEA] flex items-center justify-center">
          <Wallet className="w-10 h-10 text-white" />
        </div>

        <p className="text-sm text-muted-foreground text-center max-w-xs">
          You need to connect an Ethereum wallet on Sepolia network to receive your confidential FHZEC tokens.
        </p>

        <Button onClick={handleConnect} disabled={isConnecting} size="lg" className="w-full" variant="ethereum">
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </CardContent>
    </Card>
  );
}
