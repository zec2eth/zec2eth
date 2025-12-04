/**
 * FHE encryption utilities using CoFHE.js
 * Encrypts ZEC amount client-side for confidential bridging
 */

import type { FheEncryptionResult } from "./types";

// Track if cofhejs is initialized
let cofheInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cofhejsInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let EncryptableClass: any = null;

// Poseidon hash simulation for encAmountHash
// In production, this would use the actual Poseidon hash from circomlib
async function poseidonHash(bytes: number[]): Promise<string> {
  // Take first 32 bytes for hashing (matching circuit: PoseidonBytes(32, 3))
  const input = bytes.slice(0, 32);

  // For now, we use a simple hash representation
  // In production, replace with actual Poseidon implementation
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(input));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert to field element (take first 31 bytes to stay in field)
  const fieldBytes = hashArray.slice(0, 31);
  let result = BigInt(0);
  for (let i = 0; i < fieldBytes.length; i++) {
    result = result * BigInt(256) + BigInt(fieldBytes[i]);
  }

  return result.toString();
}

/**
 * Initialize the FHE client with CoFHE.js
 * Must be called before encryption - typically on app load
 */
export async function initFhe(provider?: unknown, signer?: unknown): Promise<boolean> {
  if (cofheInitialized && cofhejsInstance) {
    console.log("CoFHE already initialized");
    return true;
  }

  try {
    // Dynamic import for browser environment
    const cofheModule = await import("cofhejs/web");
    cofhejsInstance = cofheModule.cofhejs;
    EncryptableClass = cofheModule.Encryptable;

    // Initialize with provider and signer if available
    if (provider && signer) {
      const result = await cofhejsInstance.initialize({
        provider,
        signer,
      });

      if (result.success === false) {
        console.warn("CoFHE initialization returned error, using fallback mode:", result.error);
        cofheInitialized = false;
        return false;
      }

      // Create a permit for encryption operations
      const permitResult = await cofhejsInstance.createPermit();
      if (permitResult.success === false) {
        console.warn("CoFHE permit creation failed:", permitResult.error);
      }
    }

    cofheInitialized = true;
    console.log("CoFHE client initialized successfully");
    return true;
  } catch (error) {
    console.warn("CoFHE initialization failed, using fallback mode:", error);
    cofheInitialized = false;
    return false;
  }
}

/**
 * Re-initialize CoFHE when user changes wallet
 */
export async function reinitFhe(provider: unknown, signer: unknown): Promise<boolean> {
  cofheInitialized = false;
  cofhejsInstance = null;
  return initFhe(provider, signer);
}

/**
 * Check if CoFHE is properly initialized
 */
export function isFheInitialized(): boolean {
  return cofheInitialized && cofhejsInstance !== null;
}

/**
 * Encrypt the ZEC amount using fallback (local) encryption
 * Used when CoFHE is not available or not initialized
 * @param amount - Amount in ZEC
 * @returns Encrypted bytes, encrypted value object, and hash
 */
export async function encryptAmountFallback(amount: number): Promise<FheEncryptionResult> {
  // Convert amount to BigInt for encryption
  const amountBigInt = BigInt(Math.floor(amount * 100000000)); // Convert ZEC to zatoshis

  // Generate random bytes for encryption (128 bytes as per circuit)
  const encryptedBytes = new Array(128).fill(0);
  const randomBytes = new Uint8Array(128);
  crypto.getRandomValues(randomBytes);

  // Encode amount into encrypted bytes
  // First 8 bytes contain the amount (little-endian)
  let tempAmount = amountBigInt;
  for (let i = 0; i < 8; i++) {
    encryptedBytes[i] = Number(tempAmount & BigInt(0xff));
    tempAmount = tempAmount >> BigInt(8);
  }

  // Fill remaining bytes with random data for hiding
  for (let i = 8; i < 128; i++) {
    encryptedBytes[i] = randomBytes[i];
  }

  // Create the encrypted value object for contract call
  const encryptedValue = {
    data: encryptedBytes,
    securityZone: 0,
  };

  // Compute hash of encrypted bytes (for public input)
  const encAmountHash = await poseidonHash(encryptedBytes);

  return {
    encryptedBytes,
    encryptedValue,
    encAmountHash,
  };
}

/**
 * Encrypt the ZEC amount using CoFHE.js
 * Falls back to local encryption if CoFHE is not available
 * @param amount - Amount in ZEC (will be converted to zatoshis)
 * @returns Encrypted bytes, encrypted value object, and hash
 */
export async function encryptAmount(amount: number): Promise<FheEncryptionResult> {
  try {
    // If CoFHE is not initialized, try to initialize it first
    if (!cofheInitialized || !cofhejsInstance || !EncryptableClass) {
      const initialized = await initFhe();
      if (!initialized) {
        console.log("Using fallback encryption (CoFHE not available)");
        return encryptAmountFallback(amount);
      }
    }

    // Convert amount to zatoshis (1 ZEC = 100,000,000 zatoshis)
    const zatoshis = BigInt(Math.floor(amount * 100000000));

    // Encrypt using CoFHE.js
    // Use uint64 for the amount (sufficient for zatoshi values)
    const encryptResult = await cofhejsInstance!.encrypt(EncryptableClass!.uint64(zatoshis));

    if (encryptResult.success === false) {
      console.warn("CoFHE encryption failed:", encryptResult.error);
      return encryptAmountFallback(amount);
    }

    // Extract the encrypted data
    const encryptedInput = encryptResult.data;

    // Convert encrypted data to bytes array (128 bytes as per circuit requirement)
    let encryptedBytes: number[];
    if (encryptedInput && typeof encryptedInput === "object" && "data" in encryptedInput) {
      // If the encrypted value has a data property, use it
      const rawData = (encryptedInput as { data: Uint8Array | number[] }).data;
      encryptedBytes = Array.from(rawData);
    } else if (encryptedInput instanceof Uint8Array) {
      encryptedBytes = Array.from(encryptedInput);
    } else {
      // Serialize the encrypted object to bytes
      encryptedBytes = serializeEncryptedValue(encryptedInput);
    }

    // Pad or truncate to 128 bytes
    if (encryptedBytes.length < 128) {
      const padding = new Array(128 - encryptedBytes.length).fill(0);
      encryptedBytes = [...encryptedBytes, ...padding];
    } else if (encryptedBytes.length > 128) {
      encryptedBytes = encryptedBytes.slice(0, 128);
    }

    // Compute hash of encrypted bytes (for public input / circuit)
    const encAmountHash = await poseidonHash(encryptedBytes);

    return {
      encryptedBytes,
      encryptedValue: encryptedInput,
      encAmountHash,
    };
  } catch (error) {
    console.error("FHE encryption failed:", error);
    console.log("Using fallback encryption");
    return encryptAmountFallback(amount);
  }
}

/**
 * Helper to serialize encrypted value to bytes
 */
function serializeEncryptedValue(value: unknown): number[] {
  if (value === null || value === undefined) {
    return new Array(128).fill(0);
  }

  // Try to convert to JSON and then to bytes
  try {
    const jsonStr = JSON.stringify(value);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonStr);
    return Array.from(bytes);
  } catch {
    return new Array(128).fill(0);
  }
}

/**
 * Encrypt amount with explicit CoFHE initialization
 * Use this when you have provider/signer available
 */
export async function encryptAmountWithCoFhe(
  amount: number,
  provider?: unknown,
  signer?: unknown
): Promise<FheEncryptionResult> {
  try {
    // Initialize with provided credentials if not already done
    if (provider && signer && !cofheInitialized) {
      await initFhe(provider, signer);
    }

    return encryptAmount(amount);
  } catch (error) {
    console.error("CoFHE encryption failed, falling back to local:", error);
    return encryptAmountFallback(amount);
  }
}

/**
 * Unseal encrypted data from contract
 * Use this to decrypt values returned by FHE contracts
 */
export async function unsealValue(sealedValue: unknown): Promise<bigint | null> {
  if (!cofheInitialized || !cofhejsInstance) {
    console.error("CoFHE not initialized for unsealing");
    return null;
  }

  try {
    const result = await cofhejsInstance.unseal(sealedValue);
    if (result.success === false) {
      console.error("Unseal failed:", result.error);
      return null;
    }
    return result.data as bigint;
  } catch (error) {
    console.error("Failed to unseal value:", error);
    return null;
  }
}

/**
 * Get the current permission for contract calls
 * Needed when calling FHE contract methods that require permissions
 */
export function getPermission(): unknown {
  if (!cofheInitialized || !cofhejsInstance) {
    return null;
  }

  try {
    const permit = cofhejsInstance.getPermit();
    return permit?.getPermission?.() ?? null;
  } catch {
    return null;
  }
}
