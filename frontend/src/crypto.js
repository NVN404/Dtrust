import { ethers } from 'ethers';

// secp256r1 curve order n
export const CURVE_N = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
export const HALF_N = CURVE_N / 2n;

function bufToHex(buffer) {
  return "0x" + Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generates an uncompressed NIST P-256 keypair in the browser
 */
export async function generateSovereignP256Key() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const rawPubKey = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
  const rawBytes = new Uint8Array(rawPubKey);

  // Uncompressed format: 0x04 (1 byte) || Qx (32 bytes) || Qy (32 bytes)
  const qx = bufToHex(rawBytes.slice(1, 33));
  const qy = bufToHex(rawBytes.slice(33, 65));

  // Export private key in JWK format for display or backup
  const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    keyPair,
    qx,
    qy,
    jwk
  };
}

/**
 * Computes the canonical anti-replay PoP digest and packed buffer matching Solidity abi.encodePacked
 */
export function computePoPDigest({ chainId, resolverAddress, node, qx, qy, nonce, expiresAt }) {
  const cleanAddress = ethers.getAddress(resolverAddress.toLowerCase());
  const packed = ethers.solidityPacked(
    ["string", "uint256", "address", "bytes32", "bytes32", "bytes32", "uint64", "uint64"],
    [
      "DTRUST_POP_V1",
      BigInt(chainId),
      cleanAddress,
      node,
      qx,
      qy,
      BigInt(nonce),
      BigInt(expiresAt)
    ]
  );
  return {
    packedBytes: hexToBytes(packed),
    digestHex: ethers.sha256(packed)
  };
}

/**
 * Signs the PoP packed data with NIST P-256 and guarantees strict low-s malleability compliance.
 * Note: WebCrypto subtle.sign hashes packedBytes with SHA-256 before curve signing,
 * exactly matching Solidity: bytes32 digest = sha256(abi.encodePacked(...)).
 */
export async function signPoPDigest(privateKey, packedBytes) {
  const signatureBuffer = await window.crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    packedBytes
  );

  const sigBytes = new Uint8Array(signatureBuffer);
  const rBytes = sigBytes.slice(0, 32);
  let sBytes = sigBytes.slice(32, 64);

  let sBig = BigInt(bufToHex(sBytes));
  if (sBig > HALF_N) {
    sBig = CURVE_N - sBig;
    const hex = sBig.toString(16).padStart(64, '0');
    sBytes = hexToBytes(hex);
  }

  return {
    r: bufToHex(rBytes),
    s: bufToHex(sBytes)
  };
}
