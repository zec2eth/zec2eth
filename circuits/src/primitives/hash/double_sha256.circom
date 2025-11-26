pragma circom 2.0.0;

include "../../circomlib/circuits/bitify.circom";
include "../utils/bytes_rangecheck.circom";
include "../../circomlib/circuits/sha256/sha256.circom";

template DoubleSHA256Bytes(N) {
    signal input in[N];
    signal output out[32];

    // -----------------------
    // Predeclared structures
    // -----------------------
    component rc[N];
    component n2b[N];

    var BITLEN = N * 8;
    signal msgBits[BITLEN];

    // weights
    signal w[8];
    w[0] <== 1;
    w[1] <== 2;
    w[2] <== 4;
    w[3] <== 8;
    w[4] <== 16;
    w[5] <== 32;
    w[6] <== 64;
    w[7] <== 128;

    // partial[i][j] = Σ bits[0..j] * weights[0..j]
    signal partial[N][8];

    // reconstructed byte
    signal reconstructed[N];

    // -----------------------
    // 1. Rangecheck + Bitify
    // -----------------------
    for (var i = 0; i < N; i++) {

        rc[i] = ByteRangeCheck();
        rc[i].in <== in[i];

        n2b[i] = Num2Bits(8);
        n2b[i].in <== rc[i].out;

        // compute partial sums
        partial[i][0] <== n2b[i].out[0] * w[0];

        for (var j = 1; j < 8; j++) {
            partial[i][j] <== partial[i][j-1] + (n2b[i].out[j] * w[j]);
        }

        reconstructed[i] <== partial[i][7];

        // enforce full byte
        reconstructed[i] === rc[i].out;

        // flatten bits for sha input
        for (var j2 = 0; j2 < 8; j2++) {
            msgBits[i*8 + j2] <== n2b[i].out[j2];
        }
    }

    // -----------------------
    // 2. First SHA256
    // -----------------------
    component sha1 = Sha256(BITLEN);
    for (var k = 0; k < BITLEN; k++) {
        sha1.in[k] <== msgBits[k];
    }

    // -----------------------
    // 3. Second SHA256
    // -----------------------
    component sha2 = Sha256(256);
    for (var t = 0; t < 256; t++) {
        sha2.in[t] <== sha1.out[t];
    }

    // -----------------------
    // 4. bits → bytes (32 bytes)
    // -----------------------
    signal repack[32][8];
    signal outBytes[32];

    for (var i2 = 0; i2 < 32; i2++) {

        repack[i2][0] <== sha2.out[i2*8+0] * w[0];

        for (var b = 1; b < 8; b++) {
            repack[i2][b] <== repack[i2][b-1] + sha2.out[i2*8 + b] * w[b];
        }

        outBytes[i2] <== repack[i2][7];
        out[i2] <== outBytes[i2];
    }
}
