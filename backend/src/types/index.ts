/**
 * Type definitions for the backend
 */

// Response for /api/check-zec-tx
export interface ZecTxCheckResponse {
  found: boolean;
  confirmations: number;
  txid: string;
}

// Transaction data for circuit input (from watcher)
export interface ZecTxDataResponse {
  tx_bytes: number[];
  memo_bytes: number[];
  out_values: number[];
  out_scriptHashes: string[];
  merkle_sibling_hi: string[];
  merkle_sibling_lo: string[];
  merkle_path_dir: number[];
  merkleRoot_hi: string;
  merkleRoot_lo: string;
  txId_hi: string;
  txId_lo: string;
}

// Circuit parameters (must match circom)
export const CIRCUIT_PARAMS = {
  N_TX_BYTES: 2000,
  N_OUTPUTS: 4,
  N_MEMO_BYTES: 32,
  N_ENC_BYTES: 128,
  MERKLE_DEPTH: 20,
} as const;
