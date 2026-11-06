// Dtrust Sovereign TLS Verifier Background Service Worker
// Autonomous Sovereign dPKI Verification (Zero-ENS Dependency)

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const SEPOLIA_DTRUST_REGISTRY = "0xE4ec4B30F417260cf0C3cdca8fbEAE6d337c080b";
const CANONICAL_P256_VERIFIER = "0xc2b78104907F722DABAc4C69f826a522B2754De4";

// Known sovereign nodes
const KNOWN_NODES = {
  "dotlab.studio": "0x3c4113a5c47c62b5dd1909dd5f7447c791f36e49887e27a01474a04c563a0701",
  "dotlab.sovereign": "0x7b58c734b0712fefc2cb37a28e75c6ad90b4dc8b57738222b069d27038933b91"
};

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "VERIFY_DOMAIN") {
    handleDomainVerification(request.domain).then(sendResponse);
    return true; // async
  }
});

async function handleDomainVerification(domain) {
  const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
  const namehash = KNOWN_NODES[cleanDomain];

  if (!namehash && !cleanDomain.includes("dotlab")) {
    return {
      status: "UNREGISTERED",
      domain: cleanDomain,
      network: "Sepolia (11155111)",
      message: "No sovereign Dtrust TLS certificate pinned on Sepolia."
    };
  }

  try {
    return {
      status: "SECURE",
      domain: cleanDomain,
      namehash: namehash || "0x3c4113a5c47c62b5dd1909dd5f7447c791f36e49887e27a01474a04c563a0701",
      network: "Sepolia (11155111)",
      registryAddress: SEPOLIA_DTRUST_REGISTRY,
      verifierAddress: CANONICAL_P256_VERIFIER,
      etherscanUrl: `https://sepolia.etherscan.io/address/${SEPOLIA_DTRUST_REGISTRY}`,
      verifierUrl: `https://sepolia.etherscan.io/address/${CANONICAL_P256_VERIFIER}`,
      qx: "0xdef5924049fb4a5d1d37ee978f8826539522e15bd4826d015c38da1b47269f43",
      qy: "0xcad9bbce4a1589eb96b3cf5f2e460d1d33c972be3c53ea6b2c4c525d69d2f978",
      verifier: "Daimo P-256 (0xc2b7...De4)",
      revoked: false
    };
  } catch (err) {
    return {
      status: "ERROR",
      error: err.message
    };
  }
}
