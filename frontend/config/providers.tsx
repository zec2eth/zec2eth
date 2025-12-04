"use client";

import React, { type ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type State } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { sepolia } from "@reown/appkit/networks";

import { projectId, metadata, wagmiAdapter } from "@/config/wagmi";

// Create query client
const queryClient = new QueryClient();

// Initialize AppKit modal only once
let appKitInitialized = false;

function initializeAppKit() {
  if (appKitInitialized || typeof window === "undefined") return;
  if (!projectId) {
    console.warn("NEXT_PUBLIC_REOWN_PROJECT_ID is not set - wallet connection will not work");
    return;
  }

  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [sepolia],
    defaultNetwork: sepolia,
    metadata,
    features: {
      analytics: false,
    },
  });

  appKitInitialized = true;
}

interface ProvidersProps {
  children: ReactNode;
  initialState?: State;
}

export function Providers({ children, initialState }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeAppKit();
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{mounted ? children : null}</QueryClientProvider>
    </WagmiProvider>
  );
}
