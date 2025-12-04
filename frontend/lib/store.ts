"use client";

import { create } from "zustand";
import { ZEC_BURN_ADDRESS } from "./constants";
import type { BridgeState, ZecTxDataResponse, FheEncryptionResult, Groth16Proof } from "./types";

const initialState = {
  step: "connect" as const,
  walletAddress: "",
  amount: 0,
  burnAddress: ZEC_BURN_ADDRESS,
  txid: "",

  // TX data
  tx_bytes: [] as number[],
  memo_bytes: [] as number[],
  out_values: [] as number[],
  out_scriptHashes: [] as number[],
  merkle_sibling_hi: [] as string[],
  merkle_sibling_lo: [] as string[],
  merkle_path_dir: [] as number[],
  merkleRoot_hi: "",
  merkleRoot_lo: "",
  txId_hi: "",
  txId_lo: "",

  // FHE
  encAmount_bytes: [] as number[],
  encAmountHash: "",
  encAmountObject: null as unknown,

  // Proof
  proof: null as Groth16Proof | null,
  publicInputs: [] as string[],

  // ETH TX
  ethTxHash: "",

  // Error & loading
  error: null as string | null,
  isLoading: false,
};

export const useBridgeStore = create<BridgeState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setWalletAddress: (walletAddress) => set({ walletAddress }),
  setAmount: (amount) => set({ amount }),
  setTxid: (txid) => set({ txid }),

  setTxData: (data: ZecTxDataResponse) =>
    set({
      tx_bytes: data.tx_bytes,
      memo_bytes: data.memo_bytes,
      out_values: data.out_values,
      out_scriptHashes: data.out_scriptHashes,
      merkle_sibling_hi: data.merkle_sibling_hi,
      merkle_sibling_lo: data.merkle_sibling_lo,
      merkle_path_dir: data.merkle_path_dir,
      merkleRoot_hi: data.merkleRoot_hi,
      merkleRoot_lo: data.merkleRoot_lo,
      txId_hi: data.txId_hi,
      txId_lo: data.txId_lo,
    }),

  setFheData: (data: FheEncryptionResult) =>
    set({
      encAmount_bytes: data.encryptedBytes,
      encAmountHash: data.encAmountHash,
      encAmountObject: data.encryptedValue,
    }),

  setProofData: (proof: Groth16Proof, publicInputs: string[]) => set({ proof, publicInputs }),

  setEthTxHash: (ethTxHash) => set({ ethTxHash }),

  setError: (error) => set({ error }),
  setIsLoading: (isLoading) => set({ isLoading }),

  reset: () => set(initialState),
}));
