pragma circom 2.0.0;

include "./zecBurn.circom";

template Main() {
    var N_TX_BYTES    = 2000;
    var N_OUTPUTS     = 4;
    var N_MEMO_BYTES  = 32;
    var N_ENC_BYTES   = 128;
    var MERKLE_DEPTH  = 20;

    // --- RE-DECLARE all inputs of ZecBurnCircuit ---
    signal input txId_hi;
    signal input txId_lo;
    signal input merkleRoot_hi;
    signal input merkleRoot_lo;
    signal input burnScriptHash;
    signal input recipient;
    signal input encAmountHash;

    signal input tx_bytes[N_TX_BYTES];
    signal input out_values[N_OUTPUTS];
    signal input out_scriptHashes[N_OUTPUTS];
    signal input amount;
    signal input memo_bytes[N_MEMO_BYTES];
    signal input merkle_sibling_hi[MERKLE_DEPTH];
    signal input merkle_sibling_lo[MERKLE_DEPTH];
    signal input merkle_path_dir[MERKLE_DEPTH];
    signal input encAmount_bytes[N_ENC_BYTES];

    // --- Instantiate ---
    component c = ZecBurnCircuit(
        N_TX_BYTES,
        N_OUTPUTS,
        N_MEMO_BYTES,
        N_ENC_BYTES,
        MERKLE_DEPTH
    );

    // --- Connect ALL inputs ---
    c.txId_hi <== txId_hi;
    c.txId_lo <== txId_lo;
    c.merkleRoot_hi <== merkleRoot_hi;
    c.merkleRoot_lo <== merkleRoot_lo;
    c.burnScriptHash <== burnScriptHash;
    c.recipient <== recipient;
    c.encAmountHash <== encAmountHash;

    for (var i = 0; i < N_TX_BYTES; i++)
        c.tx_bytes[i] <== tx_bytes[i];

    for (var i = 0; i < N_OUTPUTS; i++) {
        c.out_values[i] <== out_values[i];
        c.out_scriptHashes[i] <== out_scriptHashes[i];
    }

    c.amount <== amount;

    for (var i = 0; i < N_MEMO_BYTES; i++)
        c.memo_bytes[i] <== memo_bytes[i];

    for (var i = 0; i < MERKLE_DEPTH; i++) {
        c.merkle_sibling_hi[i] <== merkle_sibling_hi[i];
        c.merkle_sibling_lo[i] <== merkle_sibling_lo[i];
        c.merkle_path_dir[i]   <== merkle_path_dir[i];
    }

    for (var i = 0; i < N_ENC_BYTES; i++)
        c.encAmount_bytes[i] <== encAmount_bytes[i];

    signal output root_hi <== c.merkleRoot_hi;
    signal output root_lo <== c.merkleRoot_lo;
}

component main {public [txId_hi,txId_lo,merkleRoot_hi,merkleRoot_lo,burnScriptHash,recipient,encAmountHash]} = Main();
