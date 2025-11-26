pragma circom 2.0.0;

include "../../circomlib/circuits/poseidon.circom";
include "../utils/bytes_rangecheck.circom";

template PoseidonBytes(N, NUM) {
    signal input in[N];
    signal output out;

    var CHUNK = 14;

    // Rangecheck
    component rc[N];
    for (var i = 0; i < N; i++) {
        rc[i] = ByteRangeCheck();
        rc[i].in <== in[i];
    }

    // Must be literal size!
    component H[NUM];
    signal chunkOut[NUM];

    for (var ci = 0; ci < NUM; ci++) {
        H[ci] = Poseidon(CHUNK + 1);

        if (ci == 0) {
            H[ci].inputs[0] <== 0;
        } else {
            H[ci].inputs[0] <== chunkOut[ci - 1];
        }

        for (var j = 0; j < CHUNK; j++) {
            var idx = ci * CHUNK + j;
            if (idx < N) {
                H[ci].inputs[1 + j] <== rc[idx].out;
            } else {
                H[ci].inputs[1 + j] <== 0;
            }
        }

        chunkOut[ci] <== H[ci].out;
    }

    out <== chunkOut[NUM - 1];
}
