// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DtrustRegistry.sol";

contract DeployRegistryScript is Script {
    // Canonical Daimo P256Verifier on Sepolia & Ethereum Mainnet
    address constant CANONICAL_P256_VERIFIER = 0xc2b78104907F722DABAc4C69f826a522B2754De4;

    function run() external returns (address registryAddress) {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address verifier = vm.envOr("P256_VERIFIER", CANONICAL_P256_VERIFIER);

        vm.startBroadcast(deployerPrivateKey);

        DtrustRegistry registry = new DtrustRegistry(verifier);
        console.log("=== Dtrust Sovereign dPKI Registry Deployed ===");
        console.log("Registry Address:", address(registry));
        console.log("Connected P-256 Verifier:", verifier);

        vm.stopBroadcast();

        return address(registry);
    }
}

