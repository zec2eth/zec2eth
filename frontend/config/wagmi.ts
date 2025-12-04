"use client";

import { cookieStorage, createStorage, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";

// Get Project ID from environment
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

if (!projectId) {
  console.warn("NEXT_PUBLIC_REOWN_PROJECT_ID is not set");
}

// Metadata for the app
export const metadata = {
  name: "ZEC → ETH Transfer",
  description: "Confidential transfer from Zcash to Ethereum",
  url: "https://zec2eth.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// Supported chains
export const chains: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia as AppKitNetwork];

// Create Wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks: chains,
  transports: {
    [sepolia.id]: http(),
  },
});

// Export config
export const config = wagmiAdapter.wagmiConfig;
