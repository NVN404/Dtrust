// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DtrustResolver.sol";
import "../src/interfaces/ITLSResolver.sol";
import "../src/libraries/P256.sol";
import "./mocks/MockENS.sol";

contract DtrustResolverTest is Test {
    DtrustResolver public resolver;
    MockENS public ens;

    address public domainOwner = address(0xABCD);
    address public attacker = address(0xDEAD);

    bytes32 public constant TEST_NODE = keccak256("dotlab.eth");
    bytes32 public constant TEST_QX = bytes32(uint256(0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff));
    bytes32 public constant TEST_QY = bytes32(uint256(0x222233334444555566667777888899990000aaaabbbbccccddddeeeeffff1111));
    bytes32 public constant TEST_R = bytes32(uint256(0x33334444555566667777888899990000aaaabbbbccccddddeeeeffff11112222));
    bytes32 public constant TEST_S = bytes32(uint256(0x4444555566667777888899990000aaaabbbbccccddddeeeeffff111122223333)); // low-s

    function setUp() public {
        ens = new MockENS();
        resolver = new DtrustResolver(address(ens), address(0));

        // Assign domain ownership to domainOwner
        ens.setOwner(TEST_NODE, domainOwner);
    }

    function mockP256Signature(bytes32 digest, bytes32 r, bytes32 s, bytes32 qx, bytes32 qy, bool valid) internal {
        bytes memory input = abi.encodePacked(digest, r, s, qx, qy);
        vm.mockCall(address(0x0100), input, abi.encode(valid ? uint256(1) : uint256(0)));
    }

    function test_SetTLSCert_Success() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 30 days);

        bytes32 popDigest = resolver.computePoPDigest(TEST_NODE, TEST_QX, TEST_QY, nonce, expiresAt);
        mockP256Signature(popDigest, TEST_R, TEST_S, TEST_QX, TEST_QY, true);

        vm.expectEmit(true, true, true, true);
        emit ITLSResolver.TLSCertUpdated(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce);

        vm.prank(domainOwner);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce, TEST_R, TEST_S);

        (bool isValid, ITLSResolver.TLSCert memory cert) = resolver.getTLSCert(TEST_NODE);
        assertTrue(isValid, "Certificate should be valid");
        assertEq(cert.subjectQx, TEST_QX);
        assertEq(cert.subjectQy, TEST_QY);
        assertEq(cert.expiresAt, expiresAt);
        assertEq(cert.nonce, 1);
        assertFalse(cert.revoked);
    }

    function test_Revert_UnauthorizedCaller() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 30 days);

        vm.prank(attacker);
        vm.expectRevert(ITLSResolver.Unauthorized.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce, TEST_R, TEST_S);
    }

    function test_Revert_InvalidProofOfPossession() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 30 days);

        bytes32 popDigest = resolver.computePoPDigest(TEST_NODE, TEST_QX, TEST_QY, nonce, expiresAt);
        mockP256Signature(popDigest, TEST_R, TEST_S, TEST_QX, TEST_QY, false); // invalid signature

        vm.prank(domainOwner);
        vm.expectRevert(ITLSResolver.InvalidProofOfPossession.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce, TEST_R, TEST_S);
    }

    function test_Revert_HighSValue() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 30 days);

        // s > n/2 (malleable signature)
        bytes32 highS = bytes32(uint256(0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551) - 1);

        vm.prank(domainOwner);
        vm.expectRevert(P256.HighSValue.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce, TEST_R, highS);
    }

    function test_Revert_InvalidNonce() public {
        uint64 nonce = 2; // expected 1
        uint64 expiresAt = uint64(block.timestamp + 30 days);

        vm.prank(domainOwner);
        vm.expectRevert(ITLSResolver.InvalidNonce.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce, TEST_R, TEST_S);
    }

    function test_Revert_InvalidExpiry() public {
        uint64 nonce = 1;
        uint64 pastExpiry = uint64(block.timestamp - 1);
        uint64 tooLongExpiry = uint64(block.timestamp + 91 days);

        vm.prank(domainOwner);
        vm.expectRevert(ITLSResolver.InvalidExpiry.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, pastExpiry, nonce, TEST_R, TEST_S);

        vm.prank(domainOwner);
        vm.expectRevert(ITLSResolver.InvalidExpiry.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, tooLongExpiry, nonce, TEST_R, TEST_S);
    }

    function test_Revocation_ByKeySignature() public {
        // 1. Issue cert
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 30 days);
        bytes32 popDigest = resolver.computePoPDigest(TEST_NODE, TEST_QX, TEST_QY, nonce, expiresAt);
        mockP256Signature(popDigest, TEST_R, TEST_S, TEST_QX, TEST_QY, true);

        vm.prank(domainOwner);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce, TEST_R, TEST_S);

        // 2. Revoke cert using server key signature
        uint64 revokeNonce = 2;
        string memory reason = "Key compromised in CI";
        bytes32 revokeDigest = resolver.computeRevocationDigest(TEST_NODE, revokeNonce, reason);
        mockP256Signature(revokeDigest, TEST_R, TEST_S, TEST_QX, TEST_QY, true);

        resolver.revokeTLSCert(TEST_NODE, revokeNonce, reason, TEST_R, TEST_S);

        (bool isValid, ITLSResolver.TLSCert memory cert) = resolver.getTLSCert(TEST_NODE);
        assertFalse(isValid, "Revoked cert must not be valid");
        assertTrue(cert.revoked, "Cert revoked flag must be true");
    }

    function test_Revocation_ByOwner() public {
        // 1. Issue cert
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 30 days);
        bytes32 popDigest = resolver.computePoPDigest(TEST_NODE, TEST_QX, TEST_QY, nonce, expiresAt);
        mockP256Signature(popDigest, TEST_R, TEST_S, TEST_QX, TEST_QY, true);

        vm.prank(domainOwner);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce, TEST_R, TEST_S);

        // 2. Domain owner triggers emergency revocation
        vm.prank(domainOwner);
        resolver.revokeTLSCertByOwner(TEST_NODE, "Emergency host shutdown");

        (bool isValid, ITLSResolver.TLSCert memory cert) = resolver.getTLSCert(TEST_NODE);
        assertFalse(isValid, "Emergency revoked cert must not be valid");
        assertTrue(cert.revoked, "Cert revoked flag must be true");
    }

    function test_ExpiryValidation() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 10 days);
        bytes32 popDigest = resolver.computePoPDigest(TEST_NODE, TEST_QX, TEST_QY, nonce, expiresAt);
        mockP256Signature(popDigest, TEST_R, TEST_S, TEST_QX, TEST_QY, true);

        vm.prank(domainOwner);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, nonce, TEST_R, TEST_S);

        // Warp 11 days into the future
        vm.warp(block.timestamp + 11 days);

        (bool isValid, ) = resolver.getTLSCert(TEST_NODE);
        assertFalse(isValid, "Expired certificate must be invalid");
    }

    function test_SupportsInterface() public view {
        assertTrue(resolver.supportsInterface(type(ITLSResolver).interfaceId));
        assertTrue(resolver.supportsInterface(0x01ffc9a7)); // ERC165
        assertFalse(resolver.supportsInterface(0xffffffff));
    }
}

