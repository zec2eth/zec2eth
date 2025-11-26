pragma circom 2.0.0;
include "./packBytesToField.circom";

// =============================================================
//  PackAddress
// =============================================================
//
//  Packs a 20-byte Ethereum address into a single field element.
// =============================================================

template PackAddress() {
    signal input addr_bytes[20];
    signal output addr_field;

    component pack = PackBytesToField(20);
    for (var i = 0; i < 20; i++) {
        pack.in[i] <== addr_bytes[i];
    }

    addr_field <== pack.out;
}
