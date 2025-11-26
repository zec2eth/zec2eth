pragma circom 2.0.0;

include "./bytes_rangecheck.circom";

template PackBytesToField(N) {
    signal input in[N];
    signal output out;

    // Byte range-checkers
    component rc[N];

    // factors[i] = 256^i
    signal factors[N];

    // partial sums
    signal partial[N];

    // ---------------------------
    // powers of 256
    // ---------------------------
    factors[0] <== 1;

    for (var i = 1; i < N; i++) {
        factors[i] <== factors[i - 1] * 256;
    }

    // ---------------------------
    // process bytes
    // ---------------------------
    for (var j = 0; j < N; j++) {
        rc[j] = ByteRangeCheck();
        rc[j].in <== in[j];
    }

    // ---------------------------
    // partial[0] = byte0 * 256^0
    // ---------------------------
    partial[0] <== rc[0].out * factors[0];

    // ---------------------------
    // partial[j] = partial[j-1] + byte[j] * 256^j
    // ---------------------------
    for (var j = 1; j < N; j++) {
        partial[j] <== partial[j - 1] + rc[j].out * factors[j];
    }

    // ---------------------------
    // final output
    // ---------------------------
    out <== partial[N - 1];
}
