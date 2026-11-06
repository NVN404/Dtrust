import DtrustArtifact from './artifacts/DtrustResolver.json';
import DtrustRegistryArtifact from './artifacts/DtrustRegistry.json';

// Canonical Daimo NIST P-256 Verifier on Ethereum Sepolia & Mainnet (100% Live)
export const CANONICAL_P256_VERIFIER = "0xc2b78104907F722DABAc4C69f826a522B2754De4";

// Standalone Sovereign DtrustRegistry
export const DTRUST_REGISTRY_ABI = DtrustRegistryArtifact.abi;
export const DTRUST_REGISTRY_BYTECODE = DtrustRegistryArtifact.bytecode.object;
export const DEFAULT_REGISTRY_ADDRESS = "0xE4ec4B30F417260cf0C3cdca8fbEAE6d337c080b";

// Reference ENS Resolver (Legacy fallback)
export const SEPOLIA_ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
export const SEPOLIA_NAME_WRAPPER = "0x0635513F179D50A207757E05759CbD106D7dFC78";
export const DEFAULT_RESOLVER_ADDRESS = "0x51Ea4B49Ac5A3f23C469792Dea9D9542a12B980F";
export const DTRUST_RESOLVER_ABI = DtrustArtifact.abi;
export const DTRUST_RESOLVER_BYTECODE = DtrustArtifact.bytecode.object;

// Sample verified issuance tx on Sepolia
export const SEPOLIA_SAMPLE_TX = "0x7d28c94e5e4fa4891b0129f12ab7183e8fa918b209c13d8e09f582910fa31298";

export const KNOWN_DOMAINS = [
  {
    name: "dotlab.studio",
    namehash: "0xfe2264932f41f9650559b32d9be92913440d90693d45ce1d90e6a9ec30eb0290",
    owner: "0xd886168001663855a8f1ea7DdEa1393A074Ee354",
    tld: "Registered Web2 Domain (Name.com)",
    type: "Production Target"
  }
];

export const EXPLORER_URLS = {
  sepolia: "https://sepolia.etherscan.io",
  ens: "https://explorer.ens.domains"
};
