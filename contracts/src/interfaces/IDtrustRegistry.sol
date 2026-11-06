// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDtrustRegistry
 * @notice Interface for the autonomous Sovereign dPKI Registry (Zero-ENS dependency)
 */
interface IDtrustRegistry {
    struct TLSCert {
        bytes32 subjectQx;    // NIST P-256 Public Key Affine X coordinate
        bytes32 subjectQy;    // NIST P-256 Public Key Affine Y coordinate
        uint64 issuedAt;      // Block timestamp of issuance
        uint64 expiresAt;     // Expiration timestamp (max 90 days)
        uint64 nonce;         // Sequential anti-replay nonce
        bool revoked;         // Immediate 1-block sovereign revocation flag
    }

    event DomainClaimed(bytes32 indexed domainHash, string domainName, address indexed owner);
    event DomainTransferred(bytes32 indexed domainHash, address indexed oldOwner, address indexed newOwner);
    event TLSCertUpdated(bytes32 indexed domainHash, bytes32 qx, bytes32 qy, uint64 expiresAt, uint64 nonce);
    event TLSCertRevoked(bytes32 indexed domainHash, uint64 nonce, string reason);

    function claimDomain(string calldata domainName) external;
    function transferDomain(string calldata domainName, address newOwner) external;

    function setTLSCert(
        string calldata domainName,
        bytes32 qx,
        bytes32 qy,
        uint64 expiresAt,
        uint64 nonce,
        bytes32 r,
        bytes32 s
    ) external;

    function revokeTLSCert(
        string calldata domainName,
        string calldata reason
    ) external;

    function revokeTLSCertWithSig(
        string calldata domainName,
        uint64 nonce,
        string calldata reason,
        bytes32 r,
        bytes32 s
    ) external;

    function getTLSCert(string calldata domainName) external view returns (bool isValid, TLSCert memory cert, address owner);
    function getDomainOwner(string calldata domainName) external view returns (address);
}

