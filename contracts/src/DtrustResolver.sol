// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IENS.sol";
import "./interfaces/INameWrapper.sol";
import "./interfaces/ITLSResolver.sol";
import "./libraries/P256.sol";

/**
 * @title DtrustResolver
 * @notice Native ENS Resolver Profile for Sovereign TLS Certificates with P-256 Proof-of-Possession.
 * @dev Enforces domain authorization via ENS / NameWrapper and verifies ECDSA signatures via precompile 0x0100.
 */
contract DtrustResolver is ITLSResolver {
    using P256 for bytes32;

    /// @notice Maximum validity lifetime for a Dtrust TLS certificate (90 days)
    uint64 public constant MAX_CERT_LIFETIME = 90 days;

    /// @notice Core ENS Registry contract
    IENS public immutable ens;

    /// @notice Optional ENS NameWrapper contract (ERC-1155 wrapped names)
    INameWrapper public immutable nameWrapper;

    /// @notice Storage for TLS certificates mapped by ENS namehash node
    mapping(bytes32 => TLSCert) internal _certs;

    /// @notice Monotonic anti-replay nonce counter per ENS node
    mapping(bytes32 => uint64) public domainNonce;

    modifier onlyAuthorised(bytes32 node) {
        if (!isAuthorised(node)) revert Unauthorized();
        _;
    }

    constructor(address _ens, address _nameWrapper) {
        require(_ens != address(0), "DTRUST: INVALID_ENS_REGISTRY");
        ens = IENS(_ens);
        nameWrapper = INameWrapper(_nameWrapper);
    }

    /**
     * @notice Checks if the sender is authorized to manage records for the given ENS node.
     * @dev Supports standard ENS Registry ownership as well as wrapped ERC-1155 subnames.
     */
    function isAuthorised(bytes32 node) public view returns (bool) {
        address owner = ens.owner(node);

        // 1. If the node is wrapped, delegate check to NameWrapper
        if (address(nameWrapper) != address(0) && owner == address(nameWrapper)) {
            return nameWrapper.canModifyName(node, msg.sender);
        }

        // 2. Direct ENS owner check or operator approval
        return owner == msg.sender || ens.isApprovedForAll(owner, msg.sender);
    }

    /**
     * @inheritdoc ITLSResolver
     */
    function setTLSCert(
        bytes32 node,
        bytes32 qx,
        bytes32 qy,
        uint64 expiresAt,
        uint64 nonce,
        bytes32 r,
        bytes32 s
    ) external onlyAuthorised(node) {
        // 1. Enforce sequential anti-replay nonce
        uint64 expectedNonce = domainNonce[node] + 1;
        if (nonce != expectedNonce) revert InvalidNonce();
        domainNonce[node] = nonce;

        // 2. Validate expiration window
        if (expiresAt <= block.timestamp || expiresAt > block.timestamp + MAX_CERT_LIFETIME) {
            revert InvalidExpiry();
        }

        // 3. Compute strict anti-replay Proof-of-Possession digest
        bytes32 popDigest = computePoPDigest(node, qx, qy, nonce, expiresAt);

        // 4. Verify Proof-of-Possession via P-256 precompile at 0x0100
        bool popValid = P256.verifySignature(popDigest, r, s, qx, qy);
        if (!popValid) revert InvalidProofOfPossession();

        // 5. Store certificate state
        _certs[node] = TLSCert({
            subjectQx: qx,
            subjectQy: qy,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            nonce: nonce,
            revoked: false
        });

        emit TLSCertUpdated(node, qx, qy, expiresAt, nonce);
    }

    /**
     * @inheritdoc ITLSResolver
     */
    function revokeTLSCert(
        bytes32 node,
        uint64 nonce,
        string calldata reason,
        bytes32 r,
        bytes32 s
    ) external {
        TLSCert storage cert = _certs[node];
        if (cert.subjectQx == bytes32(0)) revert CertificateNotFound();
        if (cert.revoked) revert CertificateAlreadyRevoked();

        uint64 expectedNonce = domainNonce[node] + 1;
        if (nonce != expectedNonce) revert InvalidNonce();
        domainNonce[node] = nonce;

        bytes32 revokeDigest = computeRevocationDigest(node, nonce, reason);

        // Verify that the revocation request is signed by the registered server key
        bool validSig = P256.verifySignature(
            revokeDigest,
            r,
            s,
            cert.subjectQx,
            cert.subjectQy
        );
        if (!validSig) revert InvalidProofOfPossession();

        cert.revoked = true;

        emit TLSCertRevoked(node, nonce, reason, address(0));
    }

    /**
     * @inheritdoc ITLSResolver
     */
    function revokeTLSCertByOwner(
        bytes32 node,
        string calldata reason
    ) external onlyAuthorised(node) {
        TLSCert storage cert = _certs[node];
        if (cert.subjectQx == bytes32(0)) revert CertificateNotFound();
        if (cert.revoked) revert CertificateAlreadyRevoked();

        domainNonce[node] += 1;
        cert.revoked = true;

        emit TLSCertRevoked(node, domainNonce[node], reason, msg.sender);
    }

    /**
     * @inheritdoc ITLSResolver
     */
    function getTLSCert(bytes32 node) external view returns (bool isValid, TLSCert memory cert) {
        cert = _certs[node];

        if (cert.subjectQx == bytes32(0)) {
            return (false, cert);
        }

        if (cert.revoked) {
            return (false, cert);
        }

        if (block.timestamp > cert.expiresAt) {
            return (false, cert);
        }

        return (true, cert);
    }

    /**
     * @inheritdoc ITLSResolver
     */
    function computePoPDigest(
        bytes32 node,
        bytes32 qx,
        bytes32 qy,
        uint64 nonce,
        uint64 expiresAt
    ) public view returns (bytes32) {
        return sha256(
            abi.encodePacked(
                "DTRUST_POP_V1",
                block.chainid,
                address(this),
                node,
                qx,
                qy,
                nonce,
                expiresAt
            )
        );
    }

    /**
     * @inheritdoc ITLSResolver
     */
    function computeRevocationDigest(
        bytes32 node,
        uint64 nonce,
        string calldata reason
    ) public view returns (bytes32) {
        return sha256(
            abi.encodePacked(
                "DTRUST_REVOKE_V1",
                block.chainid,
                address(this),
                node,
                nonce,
                keccak256(bytes(reason))
            )
        );
    }

    /**
     * @notice ERC-165 support detection.
     */
    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return interfaceID == type(ITLSResolver).interfaceId || interfaceID == 0x01ffc9a7; // ERC165
    }
}

