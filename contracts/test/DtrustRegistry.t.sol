// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DtrustRegistry.sol";
import "../lib/p256-verifier/src/P256Verifier.sol";

contract DtrustRegistryTest is Test {
    DtrustRegistry public registry;
    P256Verifier public verifier;

    address public owner = address(0x1111);
    address public attacker = address(0x6666);
    address public recipient = address(0x2222);

    string constant DOMAIN = "dotlab.studio";

    // Known test NIST P-256 keypair (affine coordinates & private key)
    // d = 0x519b9320d4d0e0c92dec50b953dee8b72e41c64d85507974f12d5b5fa9039d0
    bytes32 constant TEST_QX = 0xdef5924049fb4a5d1d37ee978f8826539522e15bd4826d015c38da1b47269f43;
    bytes32 constant TEST_QY = 0xcad9bbce4a1589eb96b3cf5f2e460d1d33c972be3c53ea6b2c4c525d69d2f978;

    function setUp() public {
        // Deploy pure Solidity P256Verifier (exact same bytecode deployed at 0xc2b78104907F722DABAc4C69f826a522B2754De4)
        verifier = new P256Verifier();
        registry = new DtrustRegistry(address(verifier));
    }

    function test_ClaimDomain_Success() public {
        vm.prank(owner);
        registry.claimDomain(DOMAIN);

        assertEq(registry.getDomainOwner(DOMAIN), owner);
    }

    function test_ClaimDomain_Revert_AlreadyClaimed() public {
        vm.prank(owner);
        registry.claimDomain(DOMAIN);

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                DtrustRegistry.DomainAlreadyClaimed.selector,
                keccak256(bytes(DOMAIN)),
                owner
            )
        );
        registry.claimDomain(DOMAIN);
    }

    function test_TransferDomain_Success() public {
        vm.prank(owner);
        registry.claimDomain(DOMAIN);

        vm.prank(owner);
        registry.transferDomain(DOMAIN, recipient);

        assertEq(registry.getDomainOwner(DOMAIN), recipient);
    }

    function test_TransferDomain_Revert_Unauthorized() public {
        vm.prank(owner);
        registry.claimDomain(DOMAIN);

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                DtrustRegistry.UnauthorizedDomainOwner.selector,
                keccak256(bytes(DOMAIN)),
                attacker
            )
        );
        registry.transferDomain(DOMAIN, attacker);
    }

    function test_AtomicClaimAndSetTLSCert() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 60 days);

        // Invalid signature must revert
        vm.prank(owner);
        vm.expectRevert(DtrustRegistry.InvalidProofOfPossession.selector);
        registry.setTLSCert(DOMAIN, TEST_QX, TEST_QY, expiresAt, nonce, bytes32(uint256(1)), bytes32(uint256(1)));
    }

    function test_Revert_HighSValue() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 30 days);

        uint256 P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551;
        uint256 highS = (P256_N / 2) + 100;

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                DtrustRegistry.HighSValue.selector,
                highS,
                P256_N / 2
            )
        );
        registry.setTLSCert(DOMAIN, TEST_QX, TEST_QY, expiresAt, nonce, bytes32(uint256(1)), bytes32(highS));
    }

    function test_Revert_InvalidExpiry() public {
        uint64 nonce = 1;
        uint64 pastExpiry = uint64(block.timestamp - 1);

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                DtrustRegistry.ExpiryNotInFuture.selector,
                pastExpiry,
                uint64(block.timestamp)
            )
        );
        registry.setTLSCert(DOMAIN, TEST_QX, TEST_QY, pastExpiry, nonce, bytes32(uint256(1)), bytes32(uint256(1)));
    }

    function test_Revert_ExpiryExceedsMaxLifetime() public {
        uint64 nonce = 1;
        uint64 tooLongExpiry = uint64(block.timestamp + 91 days);

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                DtrustRegistry.ExpiryExceedsMaximum.selector,
                tooLongExpiry,
                uint64(block.timestamp + 90 days)
            )
        );
        registry.setTLSCert(DOMAIN, TEST_QX, TEST_QY, tooLongExpiry, nonce, bytes32(uint256(1)), bytes32(uint256(1)));
    }

    function test_Revocation_ByOwner() public {
        // Setup domain claimed
        vm.prank(owner);
        registry.claimDomain(DOMAIN);

        // Owner triggers 1-block sovereign revocation
        vm.prank(owner);
        registry.revokeTLSCert(DOMAIN, "Key compromised");

        (bool isValid, IDtrustRegistry.TLSCert memory cert, address domainOwner) = registry.getTLSCert(DOMAIN);
        assertFalse(isValid);
        assertTrue(cert.revoked);
        assertEq(domainOwner, owner);
    }

    function test_Revocation_Revert_Unauthorized() public {
        vm.prank(owner);
        registry.claimDomain(DOMAIN);

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                DtrustRegistry.UnauthorizedDomainOwner.selector,
                keccak256(bytes(DOMAIN)),
                attacker
            )
        );
        registry.revokeTLSCert(DOMAIN, "Attacker attempt");
    }
}
