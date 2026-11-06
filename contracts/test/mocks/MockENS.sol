// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/IENS.sol";

contract MockENS is IENS {
    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => address) private _resolvers;
    mapping(bytes32 => uint64) private _ttls;
    mapping(address => mapping(address => bool)) private _operators;

    function setRecord(bytes32 node, address ownerAddr, address resolverAddr, uint64 ttlVal) external {
        _owners[node] = ownerAddr;
        _resolvers[node] = resolverAddr;
        _ttls[node] = ttlVal;
    }

    function setSubnodeRecord(bytes32 node, bytes32 label, address ownerAddr, address resolverAddr, uint64 ttlVal) external {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        _owners[subnode] = ownerAddr;
        _resolvers[subnode] = resolverAddr;
        _ttls[subnode] = ttlVal;
    }

    function setSubnodeOwner(bytes32 node, bytes32 label, address ownerAddr) external returns (bytes32) {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        _owners[subnode] = ownerAddr;
        return subnode;
    }

    function setResolver(bytes32 node, address resolverAddr) external {
        _resolvers[node] = resolverAddr;
    }

    function setOwner(bytes32 node, address ownerAddr) external {
        _owners[node] = ownerAddr;
    }

    function setTTL(bytes32 node, uint64 ttlVal) external {
        _ttls[node] = ttlVal;
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operators[msg.sender][operator] = approved;
    }

    function owner(bytes32 node) external view returns (address) {
        return _owners[node];
    }

    function resolver(bytes32 node) external view returns (address) {
        return _resolvers[node];
    }

    function ttl(bytes32 node) external view returns (uint64) {
        return _ttls[node];
    }

    function recordExists(bytes32 node) external view returns (bool) {
        return _owners[node] != address(0);
    }

    function isApprovedForAll(address ownerAddr, address operator) external view returns (bool) {
        return _operators[ownerAddr][operator];
    }
}

