#!/bin/bash
mkdir -p build
circom src/main.circom --r1cs --wasm --sym -o build/
