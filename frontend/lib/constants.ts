// Static burn address for Zcash
export const ZEC_BURN_ADDRESS =
  "utest1dfmw09w56lw3attzwj6gufz43fgvdrl4v4mx0zpu4hwevpudju9mfx00zcc9sdccn7u938fkg44e0fs209eaxe0kdhmelkymax8enyrrmehfmsnmg8vduwhvw07hu2k8jcffu2njh35z95kkuaqrnltwjcndz8jdmckqvmunjghtedyr";

// Circuit parameters (must match main.circom)
export const N_TX_BYTES = 2000;
export const N_OUTPUTS = 4;
export const N_MEMO_BYTES = 32;
export const N_ENC_BYTES = 128;
export const MERKLE_DEPTH = 20;

// Required confirmations for Zcash TX
export const REQUIRED_CONFIRMATIONS = 3;

// Polling interval for checking Zcash TX (ms)
export const POLL_INTERVAL = 10000;

// API endpoints
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// Contract addresses
export const BRIDGE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS as `0x${string}`;
export const FHZEC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FHZEC_CONTRACT_ADDRESS as `0x${string}`;

// Canonical burn script hash
export const BURN_SCRIPT_HASH = process.env.NEXT_PUBLIC_BURN_SCRIPT_HASH || "";
