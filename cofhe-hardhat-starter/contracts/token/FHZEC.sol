// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHERC20} from "./FHERC20.sol";
import {FHE, InEuint64, euint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FHZEC - Confidential bridged ZEC using CoFHE
/// @notice Minted/burned only by the ZEC→ETH bridge after a valid ZK burn proof.
/// @dev This is an FHERC20-compatible confidential token. All balance logic is
///      handled in the FHERC20 base; this contract only wires in bridge access.
contract FHZEC is FHERC20, Ownable {
    /// @notice Address of the bridge contract that is allowed to mint/burn.
    address public bridge;

    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);

    constructor() FHERC20("Confidential ZEC", "FHZEC", 6) Ownable(msg.sender) {}

    // =========================================================
    //                        MODIFIERS
    // =========================================================

    modifier onlyBridge() {
        require(msg.sender == bridge, "FHZEC: caller is not bridge");
        _;
    }

    // =========================================================
    //                     BRIDGE MANAGEMENT
    // =========================================================

    /// @notice Allows the owner to update the bridge address.
    /// @dev Optional safety valve in case you redeploy the bridge.
    function setBridge(address newBridge) external onlyOwner {
        require(newBridge != address(0), "FHZEC: new bridge is zero");
        address old = bridge;
        bridge = newBridge;
        emit BridgeUpdated(old, newBridge);
    }

    // =========================================================
    //                 CONFIDENTIAL MINT / BURN
    // =========================================================
    //
    // These are the entrypoints your bridge contract should call
    // AFTER verifying:
    //  - ZK proof of ZEC burn (ZecBurnCircuit)
    //  - nullifier / txId has not been used on ETH
    //  - encAmountHash matches encAmount_bytes in proof
    //  - recipient matches memo
    //
    // `InEuint64` is the "encrypted input" type from CoFHE. We
    // convert it to `euint64` inside the enclave via FHE.asEuint64
    // and hand it to FHERC20's _confidentialMint / _confidentialBurn.

    /// @notice Mint confidential tokens to `to`, using an encrypted amount.
    /// @dev Called only by the bridge after a successful ZEC burn proof.
    /// @param to Recipient of the bridged cZEC.
    /// @param value Encrypted amount as euint64 (CoFHE input type).
    /// @return minted The encrypted amount actually minted (euint64).
    function confidentialMintFromBridge(
        address to,
        euint64 value
    ) external onlyBridge returns (euint64 minted) {
        // Use FHERC20’s internal confidential mint primitive
        minted = _confidentialMint(to, value);
    }

    /// @notice Burn confidential tokens from `from`, using an encrypted amount.
    /// @dev Used for the reverse direction (ETH→ZEC), if/when you implement it.
    /// @param from Address whose confidential balance will be decreased.
    /// @param value Encrypted amount to burn.
    /// @return burned The encrypted amount actually burned.
    function confidentialBurnFromBridge(
        address from,
        euint64 value
    ) external onlyBridge returns (euint64 burned) {
        burned = _confidentialBurn(from, value);
    }

    // =========================================================
    //            CLEAR MINT FOR TESTING ONLY
    // =========================================================
    //
    // You can keep or remove this. It is useful in local dev
    // before your full ZK pipeline + CoFHE client is wired.

    /// @notice Unsafe cleartext mint, for local testing only.
    /// @dev DO NOT keep this in production; use only during development.
    function devMintPlain(
        address to,
        uint64 value
    ) external onlyOwner returns (euint64 minted) {
        minted = _mint(to, value);
    }
}
