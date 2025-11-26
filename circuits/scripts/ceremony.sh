cd ceremony
snarkjs powersoftau new bn128 22 pot22_0000.ptau -v
snarkjs powersoftau contribute pot22_0000.ptau pot22_0001.ptau --name="First contribution" -v -e="some random text"
snarkjs powersoftau prepare phase2 pot22_0001.ptau pot22_final.ptau -v