#!/bin/bash
cd ceremony
snarkjs groth16 setup ../build/main.r1cs pot22_final.ptau main_0000.zkey
snarkjs zkey contribute main_0000.zkey main.zkey
snarkjs zkey export verificationkey main.zkey verification_key.json
