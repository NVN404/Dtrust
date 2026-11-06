export const SEPOLIA_ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
export const SEPOLIA_DTRUST_RESOLVER = "0x51Ea4B49Ac5A3f23C469792Dea9D9542a12B980F"; // Default or deployed address

export const KNOWN_DOMAINS = [
  {
    name: "dotlab.studio",
    namehash: "0x3c4113a5c47c62b5dd1909dd5f7447c791f36e49887e27a01474a04c563a0701",
    owner: "0xd886168001663855a8f1ea7DdEa1393A074Ee354",
    tld: "Web2 (DNSSEC Imported)"
  },
  {
    name: "dtrust.eth",
    namehash: "0x8979cfa74ff21fc10ab78fcf7409cc9ff74000301a1c97a47b11c05d76d4eb44",
    owner: "0xd886168001663855a8f1ea7DdEa1393A074Ee354",
    tld: "Native ENS"
  }
];

export const DTRUST_RESOLVER_ABI = [
  "function setTLSCert(bytes32 node, bytes32 qx, bytes32 qy, uint64 expiresAt, uint64 nonce, bytes32 r, bytes32 s) external",
  "function revokeTLSCert(bytes32 node, uint64 nonce, string calldata reason, bytes32 r, bytes32 s) external",
  "function revokeTLSCertByOwner(bytes32 node, string calldata reason) external",
  "function getTLSCert(bytes32 node) external view returns (bool isValid, tuple(bytes32 subjectQx, bytes32 subjectQy, uint64 issuedAt, uint64 expiresAt, uint64 nonce, bool revoked) cert)",
  "function computePoPDigest(bytes32 node, bytes32 qx, bytes32 qy, uint64 nonce, uint64 expiresAt) external view returns (bytes32)",
  "function domainNonce(bytes32 node) external view returns (uint64)",
  "function isAuthorised(bytes32 node) external view returns (bool)",
  "event TLSCertUpdated(bytes32 indexed node, bytes32 subjectQx, bytes32 subjectQy, uint64 expiresAt, uint64 nonce)",
  "event TLSCertRevoked(bytes32 indexed node, uint64 nonce, string reason, address indexed revokedBy)"
];

export const ENS_REGISTRY_ABI = [
  "function owner(bytes32 node) external view returns (address)",
  "function resolver(bytes32 node) external view returns (address)",
  "function setResolver(bytes32 node, address resolver) external",
  "function setOwner(bytes32 node, address owner) external"
];
