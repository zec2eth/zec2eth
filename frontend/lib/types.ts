// Bridge flow step
export type BridgeStep = "connect" | "amount" | "burn" | "waiting" | "proving" | "submitting" | "success";

// CoFHE.js types - loosely typed to accommodate library variations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CofheJsInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CofhejsEncryptable = any;

// Response from /api/check-zec-tx
export interface ZecTxCheckResponse {
  found: boolean;
  confirmations: number;
  txid: string;
}

// Response from /api/zcash/txdata
export interface ZecTxDataResponse {
  tx_bytes: number[];
  memo_bytes: number[];
  out_values: number[];
  out_scriptHashes: number[];
  merkle_sibling_hi: string[];
  merkle_sibling_lo: string[];
  merkle_path_dir: number[];
  merkleRoot_hi: string;
  merkleRoot_lo: string;
  txId_hi: string;
  txId_lo: string;
}

// Witness for the ZecBurnCircuit
export interface CircuitWitness {
  // Public inputs
  txId_hi: string;
  txId_lo: string;
  merkleRoot_hi: string;
  merkleRoot_lo: string;
  burnScriptHash: string;
  recipient: string;
  encAmountHash: string;

  // Private inputs
  tx_bytes: number[];
  out_values: number[];
  out_scriptHashes: number[];
  amount: number;
  memo_bytes: number[];
  merkle_sibling_hi: string[];
  merkle_sibling_lo: string[];
  merkle_path_dir: number[];
  encAmount_bytes: number[];
}

// Groth16 proof structure
export interface Groth16Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;
  curve: string;
}

// FHE encryption result
export interface FheEncryptionResult {
  encryptedBytes: number[];
  encryptedValue: unknown; // InEuint64 from CoFHE
  encAmountHash: string;
}

// Zustand store state
export interface BridgeState {
  // Current step
  step: BridgeStep;
  setStep: (step: BridgeStep) => void;

  // Wallet
  walletAddress: string;
  setWalletAddress: (address: string) => void;

  // Amount
  amount: number;
  setAmount: (amount: number) => void;

  // Burn address (static)
  burnAddress: string;

  // Zcash TX ID
  txid: string;
  setTxid: (txid: string) => void;

  // From backend
  tx_bytes: number[];
  memo_bytes: number[];
  out_values: number[];
  out_scriptHashes: number[];
  merkle_sibling_hi: string[];
  merkle_sibling_lo: string[];
  merkle_path_dir: number[];
  merkleRoot_hi: string;
  merkleRoot_lo: string;
  txId_hi: string;
  txId_lo: string;
  setTxData: (data: ZecTxDataResponse) => void;

  // FHE
  encAmount_bytes: number[];
  encAmountHash: string;
  encAmountObject: unknown;
  setFheData: (data: FheEncryptionResult) => void;

  // Proof
  proof: Groth16Proof | null;
  publicInputs: string[];
  setProofData: (proof: Groth16Proof, publicInputs: string[]) => void;

  // Ethereum TX
  ethTxHash: string;
  setEthTxHash: (hash: string) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Reset
  reset: () => void;
}
