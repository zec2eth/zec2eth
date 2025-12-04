/**
 * Witness builder for ZecBurnCircuit
 * Assembles all inputs in the exact format required by the circuit
 */

import type { CircuitWitness } from "./types";
import { N_TX_BYTES, N_OUTPUTS, N_MEMO_BYTES, N_ENC_BYTES, MERKLE_DEPTH, BURN_SCRIPT_HASH } from "./constants";

interface WitnessInput {
  tx_bytes: number[];
  out_values: number[];
  out_scriptHashes: number[];
  memo_bytes: number[];
  merkle_sibling_hi: string[];
  merkle_sibling_lo: string[];
  merkle_path_dir: number[];
  merkleRoot_hi: string;
  merkleRoot_lo: string;
  txId_hi: string;
  txId_lo: string;
  encAmount_bytes: number[];
  encAmountHash: string;
  amount: number; // In ZEC
  recipient: string; // Ethereum address
}

/**
 * Pad array to exact length
 */
function padArray<T>(arr: T[], length: number, fill: T): T[] {
  if (arr.length >= length) {
    return arr.slice(0, length);
  }
  return [...arr, ...new Array(length - arr.length).fill(fill)];
}

/**
 * Convert Ethereum address to field element
 * @param address - Ethereum address (0x...)
 * @returns Field element as string
 */
function addressToField(address: string): string {
  // Remove 0x prefix and convert to BigInt
  const cleanAddress = address.toLowerCase().replace("0x", "");
  const addressBigInt = BigInt("0x" + cleanAddress);
  return addressBigInt.toString();
}

/**
 * Convert memo bytes to recipient field element
 * The circuit packs memo_bytes into a field element that should equal recipient
 */
function memoFromRecipient(recipient: string): number[] {
  // Convert recipient address to 32 bytes (padded)
  const cleanAddress = recipient.toLowerCase().replace("0x", "");
  const addressBytes = [];

  // Parse hex string to bytes
  for (let i = 0; i < cleanAddress.length; i += 2) {
    addressBytes.push(parseInt(cleanAddress.substring(i, i + 2), 16));
  }

  // Pad to 32 bytes (address is 20 bytes, pad with zeros)
  return padArray(addressBytes, N_MEMO_BYTES, 0);
}

/**
 * Build witness for ZecBurnCircuit
 * Public inputs order: [txId_hi, txId_lo, merkleRoot_hi, merkleRoot_lo, burnScriptHash, recipient, encAmountHash]
 */
export function buildWitness(input: WitnessInput): CircuitWitness {
  // Validate and pad arrays to exact circuit dimensions
  const tx_bytes = padArray(input.tx_bytes, N_TX_BYTES, 0);
  const out_values = padArray(input.out_values, N_OUTPUTS, 0);
  const out_scriptHashes = padArray(input.out_scriptHashes, N_OUTPUTS, 0);
  const memo_bytes = memoFromRecipient(input.recipient);
  const merkle_sibling_hi = padArray(input.merkle_sibling_hi, MERKLE_DEPTH, "0");
  const merkle_sibling_lo = padArray(input.merkle_sibling_lo, MERKLE_DEPTH, "0");
  const merkle_path_dir = padArray(input.merkle_path_dir, MERKLE_DEPTH, 0);
  const encAmount_bytes = padArray(input.encAmount_bytes, N_ENC_BYTES, 0);

  // Convert amount to zatoshis
  const amountZatoshis = Math.floor(input.amount * 100000000);

  // Convert recipient to field element
  const recipientField = addressToField(input.recipient);

  // Use canonical burn script hash from constants
  const burnScriptHash = BURN_SCRIPT_HASH || "0";

  const witness: CircuitWitness = {
    // Public inputs (must match circuit order)
    txId_hi: input.txId_hi,
    txId_lo: input.txId_lo,
    merkleRoot_hi: input.merkleRoot_hi,
    merkleRoot_lo: input.merkleRoot_lo,
    burnScriptHash,
    recipient: recipientField,
    encAmountHash: input.encAmountHash,

    // Private inputs
    tx_bytes,
    out_values,
    out_scriptHashes,
    amount: amountZatoshis,
    memo_bytes,
    merkle_sibling_hi,
    merkle_sibling_lo,
    merkle_path_dir,
    encAmount_bytes,
  };

  return witness;
}

/**
 * Extract public inputs from witness in correct order for verifier
 */
export function extractPublicInputs(witness: CircuitWitness): string[] {
  return [
    witness.txId_hi,
    witness.txId_lo,
    witness.merkleRoot_hi,
    witness.merkleRoot_lo,
    witness.burnScriptHash,
    witness.recipient,
    witness.encAmountHash,
  ];
}
