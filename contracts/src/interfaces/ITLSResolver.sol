// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITLSResolver
 * @notice Standard ENS Resolver Profile for Sovereign TLS Certificates (Dtrust).
 */
interface ITLSResolver {
    struct TLSCert {
        bytes32 subjectQx;    // NIST P-256 Public Key Affine X
        bytes32 subjectQy;    // NIST P-256 Public Key Affine Y
        uint64 issuedAt;      // Block timestamp of issuance
        uint64 expiresAt;     // Expiration timestamp (max 90 days from issuance)
        uint64 nonce;         // Sequential anti-replay nonce
        bool revoked;         // Immediate 1-block sovereign revocation flag
    }

    // Events
    event TLSCertUpdated(
        bytes32 indexed node,
        bytes32 subjectQx,
        bytes32 subjectQy,
        uint64 expiresAt,
        uint64 nonce
    );

    event TLSCertRevoked(
        bytes32 indexed node,
        uint64 nonce,
        string reason,
        address indexed revokedBy
    );

    // Custom Errors
    error Unauthorized();
    error InvalidProofOfPossession();
    error InvalidExpiry();
    error InvalidNonce();
    error CertificateNotFound();
    error CertificateAlreadyRevoked();

    /**
     * @notice Binds a sovereign P-256 public key to an ENS node upon cryptographic Proof-of-Possession.
     * @param node ENS namehash
     * @param qx Public Key X coordinate
     * @param qy Public Key Y coordinate
     * @param expiresAt Expiration timestamp
     * @param nonce Sequential nonce (must equal current nonce + 1)
     * @param r ECDSA signature r value
     * @param s ECDSA signature s value (enforced low-s)
     */
    function setTLSCert(
        bytes32 node,
        bytes32 qx,
        bytes32 qy,
        uint64 expiresAt,
        uint64 nonce,
        bytes32 r,
        bytes32 s
    ) external;

    /**
     * @notice Sovereign revocation signed by the server's P-256 private key.
     * @param node ENS namehash
     * @param nonce Next sequential nonce
     * @param reason Human-readable revocation reason
     * @param r ECDSA signature r value
     * @param s ECDSA signature s value
     */
    function revokeTLSCert(
        bytes32 node,
        uint64 nonce,
        string calldata reason,
        bytes32 r,
        bytes32 s
    ) external;

    /**
     * @notice Emergency revocation executed directly by the ENS domain owner.
     * @param node ENS namehash
     * @param reason Human-readable revocation reason
     */
    function revokeTLSCertByOwner(
        bytes32 node,
        string calldata reason
    ) external;

    /**
     * @notice Read the active certificate state for an ENS node.
     * @param node ENS namehash
     * @return isValid True if certificate exists, is not revoked, and is within valid time window
     * @return cert Full certificate record
     */
    function getTLSCert(bytes32 node) external view returns (bool isValid, TLSCert memory cert);

    /**
     * @notice Computes anti-replay Proof-of-Possession digest for issuance.
     */
    function computePoPDigest(
        bytes32 node,
        bytes32 qx,
        bytes32 qy,
        uint64 nonce,
        uint64 expiresAt
    ) external view returns (bytes32);

    /**
     * @notice Computes anti-replay digest for sovereign revocation.
     */
    function computeRevocationDigest(
        bytes32 node,
        uint64 nonce,
        string calldata reason
    ) external view returns (bytes32);
}
