// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IDtrustRegistry.sol";

/**
 * @title DtrustRegistry
 * @notice Autonomous Sovereign dPKI Registry (100% ENS-Independent)
 * @dev Enforces mathematical NIST P-256 (secp256r1) Proof-of-Possession via
 *      Daimo's canonical P256Verifier contract (0xc2b78104907F722DABAc4C69f826a522B2754De4)
 *      with strict low-s malleability guards and coordinate range enforcement.
 */
contract DtrustRegistry is IDtrustRegistry {
    // Canonical Daimo P256Verifier address on Ethereum Mainnet & Sepolia
    address public constant CANONICAL_P256_VERIFIER = 0xc2b78104907F722DABAc4C69f826a522B2754De4;

    // NIST P-256 Curve Constants
    uint256 internal constant P256_P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF;
    uint256 internal constant P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551;
    uint256 internal constant P256_HALF_N = P256_N / 2;

    // Domain name bounds & certificate policy
    uint64 public constant MAX_LIFETIME = 90 days;

    // Active P-256 Verifier contract
    address public immutable p256Verifier;

    // Storage
    mapping(bytes32 => address) public domainOwner;
    mapping(bytes32 => string) public domainNames;
    mapping(bytes32 => TLSCert) public certs;
    mapping(bytes32 => uint64) public domainNonce;

    // Custom Errors
    error DomainAlreadyClaimed(bytes32 domainHash, address currentOwner);
    error UnauthorizedDomainOwner(bytes32 domainHash, address caller);
    error InvalidSequentialNonce(uint64 expected, uint64 provided);
    error ExpiryNotInFuture(uint64 expiresAt, uint64 currentTime);
    error ExpiryExceedsMaximum(uint64 expiresAt, uint64 maxAllowed);
    error HighSValue(uint256 s, uint256 maxHalfN);
    error InvalidCoordinateBounds();
    error InvalidProofOfPossession();
    error CertificateAlreadyRevoked();
    error EmptyDomainName();

    constructor(address _verifier) {
        p256Verifier = _verifier != address(0) ? _verifier : CANONICAL_P256_VERIFIER;
    }

    /**
     * @notice Claim ownership of a domain name directly in the sovereign registry.
     */
    function claimDomain(string calldata domainName) external override {
        bytes32 domainHash = keccak256(bytes(domainName));
        if (bytes(domainName).length == 0) revert EmptyDomainName();
        if (domainOwner[domainHash] != address(0)) {
            revert DomainAlreadyClaimed(domainHash, domainOwner[domainHash]);
        }

        domainOwner[domainHash] = msg.sender;
        domainNames[domainHash] = domainName;
        emit DomainClaimed(domainHash, domainName, msg.sender);
    }

    /**
     * @notice Transfer domain ownership to a new wallet address.
     */
    function transferDomain(string calldata domainName, address newOwner) external override {
        bytes32 domainHash = keccak256(bytes(domainName));
        if (domainOwner[domainHash] != msg.sender) {
            revert UnauthorizedDomainOwner(domainHash, msg.sender);
        }
        require(newOwner != address(0), "Invalid new owner");

        address oldOwner = msg.sender;
        domainOwner[domainHash] = newOwner;
        emit DomainTransferred(domainHash, oldOwner, newOwner);
    }

    /**
     * @notice Pin a sovereign NIST P-256 TLS public key to a domain with mathematical PoP verification.
     * @dev If the domain is not yet claimed, msg.sender automatically claims it atomically.
     */
    function setTLSCert(
        string calldata domainName,
        bytes32 qx,
        bytes32 qy,
        uint64 expiresAt,
        uint64 nonce,
        bytes32 r,
        bytes32 s
    ) external override {
        bytes32 domainHash = keccak256(bytes(domainName));
        if (bytes(domainName).length == 0) revert EmptyDomainName();

        // Auto-claim domain if currently unclaimed, otherwise verify ownership
        address owner = domainOwner[domainHash];
        if (owner == address(0)) {
            domainOwner[domainHash] = msg.sender;
            domainNames[domainHash] = domainName;
            emit DomainClaimed(domainHash, domainName, msg.sender);
        } else if (owner != msg.sender) {
            revert UnauthorizedDomainOwner(domainHash, msg.sender);
        }

        // Sequential anti-replay nonce
        uint64 expectedNonce = domainNonce[domainHash] + 1;
        if (nonce != expectedNonce) {
            revert InvalidSequentialNonce(expectedNonce, nonce);
        }

        // Lifetime bounds
        if (expiresAt <= block.timestamp) {
            revert ExpiryNotInFuture(expiresAt, uint64(block.timestamp));
        }
        if (expiresAt > block.timestamp + MAX_LIFETIME) {
            revert ExpiryExceedsMaximum(expiresAt, uint64(block.timestamp + MAX_LIFETIME));
        }

        // Compute Anti-Replay PoP Digest
        bytes32 digest = sha256(abi.encodePacked(
            "DTRUST_POP_V1",
            block.chainid,
            address(this),
            domainHash,
            qx,
            qy,
            nonce,
            expiresAt
        ));

        // Verify mathematical Proof-of-Possession via P256 Verifier
        _verifyP256(digest, r, s, qx, qy);

        // Commit certificate state
        certs[domainHash] = TLSCert({
            subjectQx: qx,
            subjectQy: qy,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            nonce: nonce,
            revoked: false
        });

        domainNonce[domainHash] = nonce;
        emit TLSCertUpdated(domainHash, qx, qy, expiresAt, nonce);
    }

    /**
     * @notice Instant 1-Block Sovereign Revocation triggered by the domain owner.
     */
    function revokeTLSCert(string calldata domainName, string calldata reason) external override {
        bytes32 domainHash = keccak256(bytes(domainName));
        if (domainOwner[domainHash] != msg.sender) {
            revert UnauthorizedDomainOwner(domainHash, msg.sender);
        }

        TLSCert storage cert = certs[domainHash];
        if (cert.revoked) revert CertificateAlreadyRevoked();

        cert.revoked = true;
        emit TLSCertRevoked(domainHash, cert.nonce, reason);
    }

    /**
     * @notice Instant 1-Block Sovereign Revocation triggered by the server's private key signature.
     */
    function revokeTLSCertWithSig(
        string calldata domainName,
        uint64 nonce,
        string calldata reason,
        bytes32 r,
        bytes32 s
    ) external override {
        bytes32 domainHash = keccak256(bytes(domainName));
        TLSCert storage cert = certs[domainHash];
        if (cert.revoked) revert CertificateAlreadyRevoked();
        if (nonce != cert.nonce) revert InvalidSequentialNonce(cert.nonce, nonce);

        // Compute revocation digest
        bytes32 revDigest = sha256(abi.encodePacked(
            "DTRUST_REVOKE_V1",
            block.chainid,
            address(this),
            domainHash,
            nonce,
            reason
        ));

        // Verify signature against currently pinned TLS key
        _verifyP256(revDigest, r, s, cert.subjectQx, cert.subjectQy);

        cert.revoked = true;
        emit TLSCertRevoked(domainHash, nonce, reason);
    }

    /**
     * @notice Query the active sovereign TLS certificate and ownership for any domain.
     */
    function getTLSCert(string calldata domainName) external view override returns (
        bool isValid,
        TLSCert memory cert,
        address owner
    ) {
        bytes32 domainHash = keccak256(bytes(domainName));
        owner = domainOwner[domainHash];
        cert = certs[domainHash];

        isValid = (
            cert.subjectQx != bytes32(0) &&
            !cert.revoked &&
            cert.expiresAt > block.timestamp
        );
    }

    /**
     * @notice Get owner address of a domain.
     */
    function getDomainOwner(string calldata domainName) external view override returns (address) {
        return domainOwner[keccak256(bytes(domainName))];
    }

    /**
     * @dev Internal verifier helper calling Daimo's canonical P256Verifier.
     */
    function _verifyP256(
        bytes32 digest,
        bytes32 r,
        bytes32 s,
        bytes32 qx,
        bytes32 qy
    ) internal view {
        uint256 sVal = uint256(s);
        uint256 rVal = uint256(r);
        uint256 xVal = uint256(qx);
        uint256 yVal = uint256(qy);

        // Strict Low-S Invariant
        if (sVal > P256_HALF_N || sVal == 0) {
            revert HighSValue(sVal, P256_HALF_N);
        }
        if (rVal == 0 || rVal >= P256_N) {
            revert InvalidProofOfPossession();
        }

        // Coordinate Bounds
        if (xVal == 0 || xVal >= P256_P || yVal == 0 || yVal >= P256_P) {
            revert InvalidCoordinateBounds();
        }

        // Calldata: digest(32) + r(32) + s(32) + x(32) + y(32) = 160 bytes
        bytes memory payload = abi.encodePacked(digest, r, s, qx, qy);
        (bool success, bytes memory result) = p256Verifier.staticcall(payload);

        if (!success || result.length < 32 || abi.decode(result, (uint256)) != 1) {
            revert InvalidProofOfPossession();
        }
    }
}

