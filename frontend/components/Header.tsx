"use client";

import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { truncateAddress } from "@/lib/utils";
import { Wallet, LogOut, ArrowRightLeft } from "lucide-react";
import Image from "next/image";

export function Header() {
  const { address, isConnected, chain } = useAccount();

  // Safe to use hook here since the component only renders after Providers mount
  let openModal: (() => void) | undefined;
  try {
    const appKit = useAppKit();
    openModal = appKit.open;
  } catch {
    // AppKit not initialized yet
  }

  const handleOpenModal = () => {
    if (openModal) {
      openModal();
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image src="/zec2eth.png" alt="Zec2Eth" width={45} height={15} className="rounded-md" />
          <div>
            <h1 className="font-bold text-lg leading-none">ZEC → ETH</h1>
            <p className="text-xs text-muted-foreground">Confidential Transfer</p>
          </div>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {isConnected && chain && (
            <Badge variant="outline" className="hidden sm:flex">
              {chain.name}
            </Badge>
          )}

          {isConnected && address ? (
            <Button variant="outline" size="sm" onClick={handleOpenModal}>
              <Wallet className="w-4 h-4 mr-2" />
              {truncateAddress(address)}
              <LogOut className="w-3 h-3 ml-2 text-muted-foreground" />
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={handleOpenModal}>
              <Wallet className="w-4 h-4 mr-2" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
