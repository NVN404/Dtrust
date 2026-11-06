export const SEPOLIA_ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
export const SEPOLIA_DTRUST_RESOLVER = "0x51Ea4B49Ac5A3f23C469792Dea9D9542a12B980F";

// Live on-chain deployed & confirmed contracts on Monad Testnet with P-256 (0x0100) precompile:
export const LIVE_MONAD_CERT_REGISTRY = "0xE4ec4B30F417260cf0C3cdca8fbEAE6d337c080b";
export const LIVE_MONAD_TX = "0x3a3cc2a10c16ec1cdf9e7cf4b51d22a66b4ea5456cd269cfd6c6c0ad2efa754b";

export const KNOWN_DOMAINS = [
  {
    name: "dotlab.studio",
    namehash: "0x3c4113a5c47c62b5dd1909dd5f7447c791f36e49887e27a01474a04c563a0701",
    owner: "0xd886168001663855a8f1ea7DdEa1393A074Ee354",
    tld: "Web2 (DNSSEC Imported)",
    ensExplorer: "https://explorer.ens.domains/dotlab.studio"
  },
  {
    name: "dtrust.eth",
    namehash: "0x8979cfa74ff21fc10ab78fcf7409cc9ff74000301a1c97a47b11c05d76d4eb44",
    owner: "0xd886168001663855a8f1ea7DdEa1393A074Ee354",
    tld: "Native ENS",
    ensExplorer: "https://explorer.ens.domains/dtrust.eth"
  }
];

export const EXPLORER_URLS = {
  sepolia: "https://sepolia.etherscan.io",
  monad: "https://testnet.monadscan.com",
  ens: "https://explorer.ens.domains"
};
