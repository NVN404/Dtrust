// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DtrustResolver.sol";
import "../src/interfaces/ITLSResolver.sol";
import "../src/libraries/P256.sol";
import "./mocks/MockENS.sol";

contract DtrustResolverFuzzTest is Test {
    DtrustResolver public resolver;
    MockENS public ens;

    address public domainOwner = address(0xABCD);

    bytes32 public constant TEST_NODE = keccak256("fuzz.eth");
    bytes32 public constant TEST_QX = bytes32(uint256(0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff));
    bytes32 public constant TEST_QY = bytes32(uint256(0x222233334444555566667777888899990000aaaabbbbccccddddeeeeffff1111));
    bytes32 public constant TEST_R = bytes32(uint256(0x33334444555566667777888899990000aaaabbbbccccddddeeeeffff11112222));

    function setUp() public {
        ens = new MockENS();
        resolver = new DtrustResolver(address(ens), address(0));
        ens.setOwner(TEST_NODE, domainOwner);
    }

    /// @dev Fuzz test: any s value strictly above n/2 must revert with HighSValue
    function testFuzz_Revert_HighS(uint256 rawS) public {
        uint256 malleableSVal = bound(rawS, P256.HALF_N + 1, P256.N - 1);
        bytes32 malleableS = bytes32(malleableSVal);
        uint64 expiresAt = uint64(block.timestamp + 30 days);

        vm.prank(domainOwner);
        vm.expectRevert(P256.HighSValue.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, 1, TEST_R, malleableS);
    }

    /// @dev Fuzz test: any invalid nonce != 1 must revert
    function testFuzz_Revert_InvalidNonce(uint64 badNonce) public {
        vm.assume(badNonce != 1);

        uint64 expiresAt = uint64(block.timestamp + 30 days);
        bytes32 lowS = bytes32(uint256(P256.HALF_N - 100));

        vm.prank(domainOwner);
        vm.expectRevert(ITLSResolver.InvalidNonce.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, expiresAt, badNonce, TEST_R, lowS);
    }

    /// @dev Fuzz test: any out of range expiry must revert
    function testFuzz_Revert_InvalidExpiry(uint64 badExpiry) public {
        vm.assume(badExpiry <= block.timestamp || badExpiry > block.timestamp + 90 days);

        bytes32 lowS = bytes32(uint256(P256.HALF_N - 100));

        vm.prank(domainOwner);
        vm.expectRevert(ITLSResolver.InvalidExpiry.selector);
        resolver.setTLSCert(TEST_NODE, TEST_QX, TEST_QY, badExpiry, 1, TEST_R, lowS);
    }
}
