/**
 * ZK Proof generation using snarkjs
 * Loads circuit artifacts and generates Groth16 proofs
 */

import type { CircuitWitness, Groth16Proof } from "./types";

// Dynamic import for snarkjs (needed for browser)
let snarkjs: typeof import("snarkjs") | null = null;

async function loadSnarkjs() {
  if (!snarkjs) {
    snarkjs = await import("snarkjs");
  }
  return snarkjs;
}

/**
 * Generate Groth16 proof for the ZecBurnCircuit
 * @param witness - Complete witness data
 * @returns Proof and public signals
 */
export async function generateProof(witness: CircuitWitness): Promise<{
  proof: Groth16Proof;
  publicSignals: string[];
}> {
  const snarks = await loadSnarkjs();

  // Load circuit artifacts from public folder
  const wasmPath = "/main.wasm";
  const zkeyPath = "/main.zkey";

  try {
    // Fetch WASM and zkey files
    const [wasmResponse, zkeyResponse] = await Promise.all([fetch(wasmPath), fetch(zkeyPath)]);

    if (!wasmResponse.ok || !zkeyResponse.ok) {
      throw new Error("Failed to load circuit artifacts");
    }

    const wasmBuffer = await wasmResponse.arrayBuffer();
    const zkeyBuffer = await zkeyResponse.arrayBuffer();

    // Format witness for snarkjs (flatten arrays and convert to strings)
    const formattedWitness = formatWitnessForSnarkjs(witness);

    // Generate proof
    const { proof, publicSignals } = await snarks.groth16.fullProve(
      formattedWitness,
      new Uint8Array(wasmBuffer),
      new Uint8Array(zkeyBuffer)
    );

    return {
      proof: proof as Groth16Proof,
      publicSignals,
    };
  } catch (error) {
    console.error("Proof generation failed:", error);
    throw new Error(`Failed to generate proof: ${error}`);
  }
}

/**
 * Format witness for snarkjs input
 * All values must be strings or arrays of strings
 */
function formatWitnessForSnarkjs(witness: CircuitWitness): Record<string, string | string[]> {
  return {
    // Public inputs
    txId_hi: witness.txId_hi,
    txId_lo: witness.txId_lo,
    merkleRoot_hi: witness.merkleRoot_hi,
    merkleRoot_lo: witness.merkleRoot_lo,
    burnScriptHash: witness.burnScriptHash,
    recipient: witness.recipient,
    encAmountHash: witness.encAmountHash,

    // Private inputs - convert numbers to strings
    tx_bytes: witness.tx_bytes.map((b) => b.toString()),
    out_values: witness.out_values.map((v) => v.toString()),
    out_scriptHashes: witness.out_scriptHashes.map((h) => h.toString()),
    amount: witness.amount.toString(),
    memo_bytes: witness.memo_bytes.map((b) => b.toString()),
    merkle_sibling_hi: witness.merkle_sibling_hi,
    merkle_sibling_lo: witness.merkle_sibling_lo,
    merkle_path_dir: witness.merkle_path_dir.map((d) => d.toString()),
    encAmount_bytes: witness.encAmount_bytes.map((b) => b.toString()),
  };
}

/**
 * Verify proof locally (for testing)
 */
export async function verifyProofLocally(proof: Groth16Proof, publicSignals: string[]): Promise<boolean> {
  const snarks = await loadSnarkjs();

  const vkeyPath = "/verification_key.json";
  const vkeyResponse = await fetch(vkeyPath);

  if (!vkeyResponse.ok) {
    throw new Error("Failed to load verification key");
  }

  const vkey = await vkeyResponse.json();
  return await snarks.groth16.verify(vkey, publicSignals, proof);
}

/**
 * Format proof for Solidity verifier
 * Converts snarkjs proof format to uint256 arrays
 */
export function formatProofForSolidity(proof: Groth16Proof): {
  a: [bigint, bigint];
  b: [[bigint, bigint], [bigint, bigint]];
  c: [bigint, bigint];
} {
  return {
    a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    b: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])], // Note: reversed for Solidity
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
  };
}
