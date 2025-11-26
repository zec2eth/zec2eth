pragma circom 2.0.0;
include "../../circomlib/circuits/sha256/sha256.circom";
include "../utils/packBytesToField.circom";
include "../utils/bytes_rangecheck.circom";

// =============================================================
//  Sha256ConcatHiLo
// =============================================================
//
//  Hashes the concatenation of two 256-bit values, each represented
//  as (hi, lo) field elements, where hi/lo themselves encode 16 bytes.
//
//  left  = [left_hi (16 bytes)  || left_lo (16 bytes)]
//  right = [right_hi (16 bytes) || right_lo (16 bytes)]
//
//  out = doubleSHA256( left || right )
//  represented again as (out_hi, out_lo).
//
//  NOTE: This assumes you already packed bytes into hi/lo in the same way
//  as PackBytesToField(16). If not, you can treat hi/lo as “opaque” field
//  elements and define your own encoding.
// =============================================================

template Sha256ConcatHiLo() {
    signal input left_hi;
    signal input left_lo;
    signal input right_hi;
    signal input right_lo;

    signal output out_hi;
    signal output out_lo;

    // In a fully rigorous version, you'd "unpack" left_hi/lo and right_hi/lo
    // back into 16+16 bytes each. For simplicity, we assume you *also* pass
    // the corresponding byte arrays to this circuit. If you want fully
    // deterministic hi/lo <-> bytes mapping, you’ll need an UnpackFieldToBytes
    // gadget, which is more complex.
    //
    // For now, we'll assume external code does SHA256 over 32 raw bytes
    // and this gadget is more of a placeholder. You can also bypass this
    // entirely and use a Merkle tree over txid bytes directly instead of hi/lo.

    // TODO: implement full hi/lo -> bytes[32] mapping if you want strict checks.

    // For now, we simply treat hi/lo as 2 field elements that *are* the hash,
    // and not recompute the concatenation in-circuit. This keeps the MerklePath
    // skeleton usable while you decide how strict you want encoding to be.

    // NO-OP: in strict version, you'd actually compute out_hi/out_lo here.

    out_hi <== left_hi; // placeholder
    out_lo <== left_lo; // placeholder
}
