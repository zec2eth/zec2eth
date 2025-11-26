pragma circom 2.0.0;
include "../../circomlib/circuits/comparators.circom";

// =============================================================
//  IsNonZero
// =============================================================
//
//  out = 1 if in != 0
//  out = 0 if in == 0
// =============================================================

template IsNonZero() {
    signal input in;
    signal output out;

    // Simplest form: in * z = 1 for some z if in != 0.
    // But that’s expensive. Alternative:
    // - constrain in * out = 1 for in != 0 and separately range-limit out,
    // or use known utility from circomlib.
    component isZero = IsZero();
    isZero.in <== in;

    // isZero.out = 1 if in == 0, else 0
    out <== 1 - isZero.out;
}