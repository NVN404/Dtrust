// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DtrustResolver.sol";

contract DeployScript is Script {
    // Official ENS Registry on Sepolia & Mainnet
    address constant ENS_REGISTRY_SEPOLIA = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;
    address constant NAME_WRAPPER_SEPOLIA = 0x0635513F179D50A207757E05759CbD106D7dFC78;

    function run() external returns (address resolverAddress) {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address ensRegistry = vm.envOr("ENS_REGISTRY", ENS_REGISTRY_SEPOLIA);
        address nameWrapper = vm.envOr("NAME_WRAPPER", NAME_WRAPPER_SEPOLIA);

        vm.startBroadcast(deployerPrivateKey);

        DtrustResolver resolver = new DtrustResolver(ensRegistry, nameWrapper);
        console.log("DtrustResolver deployed at:", address(resolver));
        console.log("Connected to ENS Registry:", ensRegistry);
        console.log("Connected to NameWrapper:", nameWrapper);

        vm.stopBroadcast();

        return address(resolver);
    }
}
