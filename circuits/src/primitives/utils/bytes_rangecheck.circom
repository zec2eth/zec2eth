pragma circom 2.0.0;

include "../../circomlib/circuits/bitify.circom";

template ByteRangeCheck() {
    signal input in;
    signal output out;

    // Bit decomposition (0..255)
    component n2b = Num2Bits(8);
    n2b.in <== in;

    // Predeclare weights
    signal w[8];
    w[0] <== 1;
    w[1] <== 2;
    w[2] <== 4;
    w[3] <== 8;
    w[4] <== 16;
    w[5] <== 32;
    w[6] <== 64;
    w[7] <== 128;

    // Partial sums: sum[i] = Σ(bits[0..i] * weights[0..i])
    signal partial[8];

    // First element
    partial[0] <== n2b.out[0] * w[0];

    for (var i = 1; i < 8; i++) {
        partial[i] <== partial[i - 1] + n2b.out[i] * w[i];
    }

    // Final reconstructed value
    signal acc;
    acc <== partial[7];

    // Must match original byte
    in === acc;

    out <== in;
}
