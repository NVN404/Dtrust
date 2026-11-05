// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title INameWrapper
 * @notice Minimal interface for the ENS NameWrapper contract (ENSIP-13 / ERC-1155).
 */
interface INameWrapper {
    function ownerOf(uint256 id) external view returns (address owner);
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function canModifyName(bytes32 node, address addr) external view returns (bool);
}
