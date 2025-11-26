pragma circom 2.0.0;

template ZecBridgeConfig() {
    // serialization lengths
    var N_TX_BYTES = 2000;      // max serialized tx size
    var N_OUTPUTS  = 4;         // number of outputs to handle in circuit
    var N_MEMO_BYTES = 32;      // Zcash memo field is 512 bits = 64 bytes (we use 20–32 bytes)
    var N_SCRIPT_HASHES = 32;   // poseidon-friendly hash length
    var N_ENC_BYTES = 32;      // size of FHE ciphertext
    var MERKLE_DEPTH = 20;      // Zcash block tx Merkle depth
}
