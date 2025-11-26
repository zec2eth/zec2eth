// circuits/zecBurn.circom
pragma circom 2.0.0;

// === Imports ===
include "./circomlib/circuits/comparators.circom";
include "./primitives/hash/double_sha256.circom";
include "./primitives/utils/packBytesToField.circom";
include "./primitives/utils/isNonZero.circom";
include "./primitives/hash/poseidon_bytes.circom";
include "./primitives/merkle/merkle_path.circom";

// =============================================
// ZecBurnCircuit
// =============================================

template ZecBurnCircuit(
    N_TX_BYTES,
    N_OUTPUTS,
    N_MEMO_BYTES,
    N_ENC_BYTES,
    MERKLE_DEPTH
) {
    // -----------------------------------------
    // Compute NUM_ENC = ceil(N_ENC_BYTES / 14)
    // Circom 2.0: cannot divide inside array sizes → do it manually.
    // -----------------------------------------
    var CHUNK = 14;
    var NUM_ENC = (N_ENC_BYTES + CHUNK - 1) / CHUNK;

    // =============================================
    // PUBLIC INPUTS
    // =============================================
    signal input txId_hi;
    signal input txId_lo;

    signal input merkleRoot_hi;
    signal input merkleRoot_lo;

    signal input burnScriptHash;
    signal input recipient;
    signal input encAmountHash;

    // =============================================
    // PRIVATE INPUTS
    // =============================================
    signal input tx_bytes[N_TX_BYTES];

    signal input out_values[N_OUTPUTS];
    signal input out_scriptHashes[N_OUTPUTS];

    signal input amount;

    signal input memo_bytes[N_MEMO_BYTES];

    signal input merkle_sibling_hi[MERKLE_DEPTH];
    signal input merkle_sibling_lo[MERKLE_DEPTH];
    signal input merkle_path_dir[MERKLE_DEPTH];   // 0/1 direction bits

    signal input encAmount_bytes[N_ENC_BYTES];

    // =============================================
    // A) TxID correctness: DoubleSHA256(tx_bytes)
    // =============================================
    component txHash = DoubleSHA256Bytes(N_TX_BYTES);
    for (var i = 0; i < N_TX_BYTES; i++) {
        txHash.in[i] <== tx_bytes[i];
    }

    component packHi = PackBytesToField(16);
    component packLo = PackBytesToField(16);

    for (var j = 0; j < 16; j++) {
        packHi.in[j] <== txHash.out[j];
        packLo.in[j] <== txHash.out[j + 16];
    }

    packHi.out === txId_hi;
    packLo.out === txId_lo;

    // =============================================
    // B) Burn outputs: sum values where scriptHash == burnScriptHash
    // =============================================

    component eq[N_OUTPUTS];
    signal isBurn[N_OUTPUTS];
    signal contrib[N_OUTPUTS];

    // prefix sums
    signal sumPartial[N_OUTPUTS];
    signal burnedPartial[N_OUTPUTS];

    for (var k = 0; k < N_OUTPUTS; k++) {
        eq[k] = IsEqual();
        eq[k].in[0] <== out_scriptHashes[k];
        eq[k].in[1] <== burnScriptHash;

        isBurn[k] <== eq[k].out;
        contrib[k] <== out_values[k] * isBurn[k];
    }

    // count matches
    sumPartial[0] <== isBurn[0];
    for (var k2 = 1; k2 < N_OUTPUTS; k2++) {
        sumPartial[k2] <== sumPartial[k2 - 1] + isBurn[k2];
    }

    signal sumMatches;
    sumMatches <== sumPartial[N_OUTPUTS - 1];

    component nz = IsNonZero();
    nz.in <== sumMatches;

    // total burned
    burnedPartial[0] <== contrib[0];
    for (var k3 = 1; k3 < N_OUTPUTS; k3++) {
        burnedPartial[k3] <== burnedPartial[k3 - 1] + contrib[k3];
    }

    signal totalBurned;
    totalBurned <== burnedPartial[N_OUTPUTS - 1];

    totalBurned === amount;

    // =============================================
    // C) Recipient binding: memo → field → recipient
    // =============================================

    component memoPack = PackBytesToField(N_MEMO_BYTES);
    for (var m = 0; m < N_MEMO_BYTES; m++) {
        memoPack.in[m] <== memo_bytes[m];
    }

    memoPack.out === recipient;

    // =============================================
    // D) Merkle inclusion: txId in Merkle tree
    // =============================================

    component mp = MerklePath(MERKLE_DEPTH);

    mp.leaf_hi <== txId_hi;
    mp.leaf_lo <== txId_lo;

    for (var d = 0; d < MERKLE_DEPTH; d++) {
        mp.sibling_hi[d] <== merkle_sibling_hi[d];
        mp.sibling_lo[d] <== merkle_sibling_lo[d];
        mp.path_dir[d]   <== merkle_path_dir[d];
    }

    mp.root_hi === merkleRoot_hi;
    mp.root_lo === merkleRoot_lo;

    // =============================================
    // E) Ciphertext binding: PoseidonBytes(enc) == encAmountHash
    // =============================================

    component hashEnc = PoseidonBytes(32, 3);
    for (var e = 0; e < 32; e++) {
        hashEnc.in[e] <== encAmount_bytes[e];
    }

    hashEnc.out === encAmountHash;
}
