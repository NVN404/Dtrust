// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DtrustResolver.sol";
import "../src/interfaces/ITLSResolver.sol";
import "../src/libraries/P256.sol";
import "./mocks/MockENS.sol";

/**
 * @title TestENSFlow
 * @notice Full end-to-end integration test of the ENS domain lifecycle with Dtrust.
 * Uses the exact real-world namehash of dotlab.studio and the user's deployer wallet.
 */
contract TestENSFlow is Test {
    DtrustResolver public resolver;
    MockENS public ens;

    // Real-world values from the user's domain setup
    address public deployerWallet = 0xd886168001663855a8f1ea7DdEa1393A074Ee354;
    address public attackerWallet = 0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF;

    // namehash("dotlab.studio") from ENS Explorer
    bytes32 public constant DOTLAB_STUDIO_NODE = 0x3c4113a5c47c62b5dd1909dd5f7447c791f36e49887e27a01474a04c563a0701;

    // Legitimate server P-256 keypair coordinates
    bytes32 public constant SERVER_QX = bytes32(uint256(0x5555aaaa5555aaaa5555aaaa5555aaaa5555aaaa5555aaaa5555aaaa5555aaaa));
    bytes32 public constant SERVER_QY = bytes32(uint256(0x6666bbbb6666bbbb6666bbbb6666bbbb6666bbbb6666bbbb6666bbbb6666bbbb));
    bytes32 public constant SERVER_R  = bytes32(uint256(0x7777cccc7777cccc7777cccc7777cccc7777cccc7777cccc7777cccc7777cccc));
    bytes32 public constant SERVER_S  = bytes32(uint256(0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff)); // strict low-s

    // Rogue / Fake CA keypair coordinates (simulated attacker)
    bytes32 public constant ROGUE_QX  = bytes32(uint256(0x9999ffff9999ffff9999ffff9999ffff9999ffff9999ffff9999ffff9999ffff));
    bytes32 public constant ROGUE_QY  = bytes32(uint256(0x8888eeee8888eeee8888eeee8888eeee8888eeee8888eeee8888eeee8888eeee));

    function setUp() public {
        // 1. Deploy core ENS Registry
        ens = new MockENS();

        // 2. Deploy DtrustResolver pointing to ENS Registry
        resolver = new DtrustResolver(address(ens), address(0));

        // 3. Register dotlab.studio on ENS:
        // Owner = deployerWallet (0xd886168001663855a8f1ea7DdEa1393A074Ee354)
        // Resolver = DtrustResolver
        ens.setRecord(
            DOTLAB_STUDIO_NODE,
            deployerWallet,
            address(resolver),
            300 // TTL
        );
    }

    function mockP256Signature(bytes32 digest, bytes32 r, bytes32 s, bytes32 qx, bytes32 qy, bool valid) internal {
        bytes memory input = abi.encodePacked(digest, r, s, qx, qy);
        vm.mockCall(address(0x0100), input, abi.encode(valid ? uint256(1) : uint256(0)));
    }

    /**
     * @notice Test 1: Full legitimate onboarding of dotlab.studio
     */
    function test_ENS_FullLegitimateOnboarding() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 60 days);

        // Compute Proof-of-Possession digest
        bytes32 popDigest = resolver.computePoPDigest(
            DOTLAB_STUDIO_NODE,
            SERVER_QX,
            SERVER_QY,
            nonce,
            expiresAt
        );

        // Precompile validates the P-256 PoP signature
        mockP256Signature(popDigest, SERVER_R, SERVER_S, SERVER_QX, SERVER_QY, true);

        // Owner (0xd88...354) calls setTLSCert
        vm.prank(deployerWallet);
        resolver.setTLSCert(
            DOTLAB_STUDIO_NODE,
            SERVER_QX,
            SERVER_QY,
            expiresAt,
            nonce,
            SERVER_R,
            SERVER_S
        );

        // Verify resolver state
        (bool isValid, ITLSResolver.TLSCert memory cert) = resolver.getTLSCert(DOTLAB_STUDIO_NODE);
        assertTrue(isValid, "dotlab.studio certificate must be valid");
        assertEq(cert.subjectQx, SERVER_QX, "Public key Qx must match server key");
        assertEq(cert.subjectQy, SERVER_QY, "Public key Qy must match server key");
        assertEq(cert.nonce, 1, "Nonce must be 1");
        assertFalse(cert.revoked, "Certificate must not be revoked");
        console.log("[PASS] Legitimate dotlab.studio TLS key successfully pinned on ENS!");
    }

    /**
     * @notice Test 2: Attacker tries to hijack dotlab.studio without ENS ownership
     */
    function test_ENS_RejectAttackerHijack() public {
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 60 days);

        // Attacker attempts to call setTLSCert for dotlab.studio
        vm.prank(attackerWallet);
        vm.expectRevert(ITLSResolver.Unauthorized.selector);
        resolver.setTLSCert(
            DOTLAB_STUDIO_NODE,
            ROGUE_QX,
            ROGUE_QY,
            expiresAt,
            nonce,
            SERVER_R,
            SERVER_S
        );
        console.log("[PASS] Unauthorized attacker blocked from modifying dotlab.studio records!");
    }

    /**
     * @notice Test 3: Negative Override demonstration (Rogue CA certificate caught)
     */
    function test_ENS_NegativeOverrideCatchRogueCert() public {
        // Step A: Legitimate key is registered
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 60 days);
        bytes32 popDigest = resolver.computePoPDigest(
            DOTLAB_STUDIO_NODE,
            SERVER_QX,
            SERVER_QY,
            nonce,
            expiresAt
        );
        mockP256Signature(popDigest, SERVER_R, SERVER_S, SERVER_QX, SERVER_QY, true);

        vm.prank(deployerWallet);
        resolver.setTLSCert(
            DOTLAB_STUDIO_NODE,
            SERVER_QX,
            SERVER_QY,
            expiresAt,
            nonce,
            SERVER_R,
            SERVER_S
        );

        // Step B: Client browser visits https://dotlab.studio
        // Client reads on-chain key:
        (bool isValid, ITLSResolver.TLSCert memory cert) = resolver.getTLSCert(DOTLAB_STUDIO_NODE);
        assertTrue(isValid);

        // Step C: Client compares presented TLS cert against on-chain key:
        // Scenario 1: Server presents legitimate key -> MATCH
        bool legitMatch = (cert.subjectQx == SERVER_QX && cert.subjectQy == SERVER_QY);
        assertTrue(legitMatch, "Legitimate server key matches on-chain record");

        // Scenario 2: Hacker / Rogue CA issues fake cert for dotlab.studio -> MISMATCH
        bool rogueMatch = (cert.subjectQx == ROGUE_QX && cert.subjectQy == ROGUE_QY);
        assertFalse(rogueMatch, "Rogue certificate does NOT match on-chain record!");
        console.log("[PASS] Negative Override successfully detected and flagged Rogue CA certificate!");
    }

    /**
     * @notice Test 4: 1-Block Instant Sovereign Revocation
     */
    function test_ENS_Instant1BlockRevocation() public {
        // Step A: Register cert
        uint64 nonce = 1;
        uint64 expiresAt = uint64(block.timestamp + 60 days);
        bytes32 popDigest = resolver.computePoPDigest(
            DOTLAB_STUDIO_NODE,
            SERVER_QX,
            SERVER_QY,
            nonce,
            expiresAt
        );
        mockP256Signature(popDigest, SERVER_R, SERVER_S, SERVER_QX, SERVER_QY, true);

        vm.prank(deployerWallet);
        resolver.setTLSCert(
            DOTLAB_STUDIO_NODE,
            SERVER_QX,
            SERVER_QY,
            expiresAt,
            nonce,
            SERVER_R,
            SERVER_S
        );

        // Step B: Server detects private key leak -> fires instant revocation signed with key
        uint64 revokeNonce = 2;
        string memory reason = "Key compromise detected in server memory";
        bytes32 revokeDigest = resolver.computeRevocationDigest(DOTLAB_STUDIO_NODE, revokeNonce, reason);
        mockP256Signature(revokeDigest, SERVER_R, SERVER_S, SERVER_QX, SERVER_QY, true);

        resolver.revokeTLSCert(DOTLAB_STUDIO_NODE, revokeNonce, reason, SERVER_R, SERVER_S);

        // Step C: Check on-chain state immediately in the same block
        (bool isValidAfterRevoke, ITLSResolver.TLSCert memory revokedCert) = resolver.getTLSCert(DOTLAB_STUDIO_NODE);
        assertFalse(isValidAfterRevoke, "Revoked certificate must immediately become invalid");
        assertTrue(revokedCert.revoked, "Revoked flag must be true");
        console.log("[PASS] 1-Block Sovereign Revocation confirmed! Global invalidation active.");
    }
}

