/**
 * Smart contract interactions
 * Exports contract instances and helper functions
 */

import { createPublicClient, createWalletClient, http, custom } from "viem";
import { sepolia } from "viem/chains";
import { BRIDGE_CONTRACT_ADDRESS } from "./constants";
import type { Groth16Proof } from "./types";

// Bridge contract ABI (relevant functions only)
export const bridgeAbi = [
  {
    inputs: [
      { name: "a", type: "uint256[2]" },
      { name: "b", type: "uint256[2][2]" },
      { name: "c", type: "uint256[2]" },
      { name: "publicInputs", type: "uint256[7]" },
      {
        name: "encAmount",
        type: "tuple",
        components: [
          { name: "data", type: "bytes" },
          { name: "securityZone", type: "uint8" },
        ],
      },
    ],
    name: "bridgeMintFromZec",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "txKey", type: "bytes32" }],
    name: "usedTx",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// FHZEC token ABI (relevant functions only)
export const fhzecAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Create public client for reading contract state
 */
export function getPublicClient() {
  return createPublicClient({
    chain: sepolia,
    transport: http(),
  });
}

/**
 * Create wallet client for sending transactions
 * Requires window.ethereum
 */
export function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No ethereum provider found");
  }

  return createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum as Parameters<typeof custom>[0]),
  });
}

/**
 * Format proof for contract call
 */
function formatProofForContract(proof: Groth16Proof): {
  a: readonly [bigint, bigint];
  b: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
  c: readonly [bigint, bigint];
} {
  return {
    a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as const,
    b: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])] as const,
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])] as const,
    ] as const,
    c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as const,
  };
}

/**
 * Call bridgeMintFromZec on the bridge contract
 */
export async function bridgeMintFromZec(
  proof: Groth16Proof,
  publicInputs: string[],
  encAmountObject: { data: number[]; securityZone: number },
  account: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const formattedProof = formatProofForContract(proof);

  // Convert public inputs to bigint array
  const publicInputsBigInt = publicInputs.map((p) => BigInt(p)) as [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
  ];

  // Convert encrypted amount data to bytes
  const encAmountData = new Uint8Array(encAmountObject.data);

  // Simulate first to check for errors
  await publicClient.simulateContract({
    address: BRIDGE_CONTRACT_ADDRESS,
    abi: bridgeAbi,
    functionName: "bridgeMintFromZec",
    args: [
      formattedProof.a,
      formattedProof.b,
      formattedProof.c,
      publicInputsBigInt,
      {
        data: `0x${Buffer.from(encAmountData).toString("hex")}` as `0x${string}`,
        securityZone: encAmountObject.securityZone,
      },
    ],
    account,
  });

  // Send transaction
  const hash = await walletClient.writeContract({
    address: BRIDGE_CONTRACT_ADDRESS,
    abi: bridgeAbi,
    functionName: "bridgeMintFromZec",
    args: [
      formattedProof.a,
      formattedProof.b,
      formattedProof.c,
      publicInputsBigInt,
      {
        data: `0x${Buffer.from(encAmountData).toString("hex")}` as `0x${string}`,
        securityZone: encAmountObject.securityZone,
      },
    ],
    account,
    chain: sepolia,
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

/**
 * Check if a transaction has already been used
 */
export async function isTxUsed(txIdHi: string, txIdLo: string): Promise<boolean> {
  const publicClient = getPublicClient();

  // Compute txKey as keccak256(abi.encodePacked(hi, lo))
  const { keccak256, encodePacked } = await import("viem");
  const txKey = keccak256(encodePacked(["uint256", "uint256"], [BigInt(txIdHi), BigInt(txIdLo)]));

  const result = await publicClient.readContract({
    address: BRIDGE_CONTRACT_ADDRESS,
    abi: bridgeAbi,
    functionName: "usedTx",
    args: [txKey as `0x${string}`],
  });

  return result;
}
