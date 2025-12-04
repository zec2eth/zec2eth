# ZEC → ETH Confidential Bridge Frontend

A Next.js frontend for bridging Zcash (ZEC) to confidential FHZEC tokens on Ethereum using FHE (Fully Homomorphic Encryption) and ZK proofs.

## Features

- 🔐 **Confidential Bridging**: Your ZEC amount is encrypted using CoFHE before minting
- 🛡️ **Zero-Knowledge Proofs**: Proves ZEC burn without revealing transaction details
- 👛 **Wallet Integration**: Connect with any Ethereum wallet via Reown (WalletConnect)
- 🎨 **Modern UI**: Built with Tailwind CSS and ShadCN components
- ⚡ **Client-Side Proving**: All ZK proof generation happens in your browser

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + ShadCN UI
- **Wallet**: Wagmi v3 + Reown AppKit
- **State**: Zustand
- **ZK Proofs**: snarkjs (Groth16)
- **FHE**: CoFHE.js

## Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
```

## Environment Setup

Edit `.env.local` with your configuration:

```env
# Reown (WalletConnect) Project ID
# Get one at https://cloud.reown.com
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id_here

# API Base URL for backend endpoints
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Bridge Contract Address (Ethereum Sepolia)
NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS=0x...

# FHZEC Token Contract Address (Ethereum Sepolia)
NEXT_PUBLIC_FHZEC_CONTRACT_ADDRESS=0x...

# Canonical Burn Script Hash (from contract)
NEXT_PUBLIC_BURN_SCRIPT_HASH=0x...
```

## Circuit Artifacts Setup

Place the compiled circuit artifacts in the `public/` folder:

```
public/
├── main.wasm          # Compiled circuit WASM
├── main.zkey          # Groth16 proving key
└── verification_key.json  # (Optional) For local verification
```

To generate these files from the circuits:

```bash
cd ../circuits

# Compile the circuit
./scripts/1_compile.sh

# Run the ceremony (or use existing powers of tau)
./scripts/2_ceremony.sh

# Generate Groth16 keys
./scripts/3_setup-groth16.sh

# Copy artifacts to frontend
cp build/main.wasm ../frontend/public/
cp build/main.zkey ../frontend/public/
cp build/verification_key.json ../frontend/public/
```

## Running Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend API Requirements

The frontend expects the following backend endpoints:

### 1. Check ZEC Transaction

```
GET /api/check-zec-tx?address=<burn-address>&amount=<expectedAmount>
```

Response:
```json
{
  "found": true,
  "confirmations": 8,
  "txid": "abc123..."
}
```

### 2. Fetch ZEC Transaction Data

```
GET /api/zcash/txdata?txid=<txid>
```

Response:
```json
{
  "tx_bytes": [...],
  "memo_bytes": [...],
  "out_values": [...],
  "out_scriptHashes": [...],
  "merkle_sibling_hi": [...],
  "merkle_sibling_lo": [...],
  "merkle_path_dir": [...],
  "merkleRoot_hi": "...",
  "merkleRoot_lo": "...",
  "txId_hi": "...",
  "txId_lo": "..."
}
```

## Bridge Flow

1. **Connect Wallet** - Connect your Ethereum wallet (Sepolia network)
2. **Enter Amount** - Specify how much ZEC to bridge
3. **Send ZEC** - Send ZEC to the displayed burn address
4. **Wait for Confirmation** - Wait for 6+ Zcash confirmations
5. **Generate Proof** - Client-side FHE encryption + ZK proof generation
6. **Submit Transaction** - Call bridge contract on Ethereum
7. **Success** - Receive confidential FHZEC tokens

## Project Structure

```
frontend/
├── app/
│   ├── globals.css      # Global styles + CSS variables
│   ├── layout.tsx       # Root layout with providers
│   └── page.tsx         # Main bridge page
├── components/
│   ├── bridge/          # Bridge flow components
│   │   ├── AmountInput.tsx
│   │   ├── BridgeFlow.tsx
│   │   ├── BurnAddress.tsx
│   │   ├── ConnectWallet.tsx
│   │   ├── ProofGeneration.tsx
│   │   ├── SubmitTransaction.tsx
│   │   ├── SuccessScreen.tsx
│   │   └── WaitingForTx.tsx
│   ├── ui/              # ShadCN UI components
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── StepIndicator.tsx
├── config/
│   ├── providers.tsx    # React Query + Wagmi providers
│   └── wagmi.ts         # Wagmi + Reown configuration
├── lib/
│   ├── api.ts           # Backend API client
│   ├── constants.ts     # Static constants
│   ├── contracts.ts     # Contract ABIs + interactions
│   ├── fhe.ts           # FHE encryption utilities
│   ├── prover.ts        # ZK proof generation
│   ├── store.ts         # Zustand state store
│   ├── types.ts         # TypeScript types
│   ├── utils.ts         # Utility functions
│   └── witness.ts       # Circuit witness builder
└── public/
    ├── main.wasm        # Circuit WASM (add manually)
    └── main.zkey        # Proving key (add manually)
```

## Security Notes

- **Client-Side Encryption**: The ZEC amount is encrypted using FHE before any data leaves your browser
- **No Plaintext to Backend**: The backend never sees your plaintext amount
- **ZK Privacy**: The ZK proof reveals only what's necessary for verification
- **FHZEC Confidentiality**: Your token balance is encrypted on-chain

## License

MIT
