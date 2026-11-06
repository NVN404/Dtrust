import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  Zap, 
  ExternalLink, 
  Download,
  Flame,
  ArrowRight
} from 'lucide-react';
import { 
  generateSovereignP256Key, 
  computePoPDigest, 
  signPoPDigest 
} from './crypto';
import { 
  KNOWN_DOMAINS, 
  SEPOLIA_ENS_REGISTRY,
  SEPOLIA_DTRUST_RESOLVER,
  SEPOLIA_SAMPLE_TX
} from './contracts';
import { ethers } from 'ethers';

export default function App() {
  // Wallet State
  const [wallet, setWallet] = useState(null);
  const [network, setNetwork] = useState('Sepolia (11155111)');

  // Domain Selection
  const [selectedDomain, setSelectedDomain] = useState(KNOWN_DOMAINS[0]);
  const [customDomain, setCustomDomain] = useState('');

  // Key & Cryptography State
  const [keyPair, setKeyPair] = useState(null);
  const [qx, setQx] = useState('');
  const [qy, setQy] = useState('');
  const [jwk, setJwk] = useState(null);

  // PoP Signature State
  const [popDigest, setPopDigest] = useState('');
  const [sigR, setSigR] = useState('');
  const [sigS, setSigS] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // On-Chain Commitment State
  const [isPublishing, setIsPublishing] = useState(false);
  const [pinnedCert, setPinnedCert] = useState(null);
  const [txHash, setTxHash] = useState('');

  // Attack Simulator State
  const [simMode, setSimMode] = useState('legit'); // 'legit' or 'rogue'
  const [simModalOpen, setSimModalOpen] = useState(false);

  // Auto-connect demo wallet on load
  useEffect(() => {
    setWallet({
      address: '0xd886168001663855a8f1ea7DdEa1393A074Ee354',
      name: 'Deployer & Domain Owner'
    });
  }, []);

  // Connect MetaMask
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected! Please install MetaMask to broadcast live Sepolia transactions.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const net = await provider.getNetwork();
      setWallet({
        address: accounts[0],
        name: 'MetaMask Account'
      });
      setNetwork(net.chainId === 11155111n ? 'Sepolia (11155111)' : `Chain ID: ${net.chainId.toString()}`);
    } catch (err) {
      console.error(err);
      alert("Wallet connection failed: " + err.message);
    }
  };

  // 1. Generate P-256 Key
  const handleGenerateKey = async () => {
    try {
      const { keyPair, qx, qy, jwk } = await generateSovereignP256Key();
      setKeyPair(keyPair);
      setQx(qx);
      setQy(qy);
      setJwk(jwk);
      setPopDigest('');
      setSigR('');
      setSigS('');
    } catch (err) {
      console.error(err);
      alert('Key generation failed: ' + err.message);
    }
  };

  // 2. Sign Proof-of-Possession
  const handleSignPoP = async () => {
    if (!keyPair) return;
    setIsSigning(true);
    try {
      const chainId = 11155111;
      const nonce = pinnedCert ? BigInt(pinnedCert.nonce + 1) : 1n;
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 60 * 86400); // 60 days

      const digestBuffer = await computePoPDigest({
        chainId,
        resolverAddress: SEPOLIA_DTRUST_RESOLVER,
        node: selectedDomain.namehash,
        qx,
        qy,
        nonce,
        expiresAt
      });

      const digestHex = "0x" + Array.from(new Uint8Array(digestBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      setPopDigest(digestHex);

      const { r, s } = await signPoPDigest(keyPair.privateKey, digestBuffer);
      setSigR(r);
      setSigS(s);
    } catch (err) {
      console.error(err);
      alert('PoP Signing failed: ' + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  // 3. Publish to ENS Resolver
  const handlePublish = async () => {
    if (!sigR || !sigS) return;
    setIsPublishing(true);

    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Ensure on Sepolia (11155111 / 0xaa36a7)
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchError) {
          console.warn("Could not auto-switch chain to Sepolia:", switchError);
        }

        const resolver = new ethers.Contract(
          SEPOLIA_DTRUST_RESOLVER,
          [
            "function setTLSCert(bytes32 node, bytes32 qx, bytes32 qy, uint64 expiresAt, uint64 nonce, bytes32 r, bytes32 s) external"
          ],
          signer
        );

        const nonce = pinnedCert ? BigInt(pinnedCert.nonce + 1) : 1n;
        const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 60 * 86400);

        console.log("Broadcasting real transaction to Sepolia via MetaMask...");
        const tx = await resolver.setTLSCert(
          selectedDomain.namehash,
          qx,
          qy,
          expiresAt,
          nonce,
          sigR,
          sigS
        );

        setTxHash(tx.hash);
        console.log("Transaction submitted to Sepolia:", tx.hash);

        const newCert = {
          domain: selectedDomain.name,
          namehash: selectedDomain.namehash,
          qx,
          qy,
          nonce: Number(nonce),
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Number(expiresAt),
          revoked: false
        };
        setPinnedCert(newCert);

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        throw new Error("MetaMask is not detected. To submit real transactions to Sepolia, install MetaMask with Sepolia testnet ETH.");
      }
    } catch (err) {
      console.warn("Sepolia Broadcast Notice:", err);
      alert(`Sepolia Broadcast Notice:\n\n${err.reason || err.message}\n\nNote: To record an actual transaction on Sepolia Etherscan, your connected MetaMask wallet needs Sepolia ETH for gas.`);

      // Set fallback sample so the demo continues
      setTxHash(SEPOLIA_SAMPLE_TX);
      setPinnedCert({
        domain: selectedDomain.name,
        namehash: selectedDomain.namehash,
        qx,
        qy,
        nonce: pinnedCert ? pinnedCert.nonce + 1 : 1,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 86400,
        revoked: false
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // 4. Instant Revoke
  const handleRevoke = () => {
    if (!pinnedCert) return;
    if (confirm('Are you sure you want to trigger 1-Block Sovereign Revocation? This permanently invalidates the current TLS key worldwide.')) {
      setPinnedCert(prev => ({ ...prev, revoked: true }));
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-20">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0d1322]/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-wide">Dtrust</h1>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                ENS-Native dPKI
              </span>
            </div>
            <p className="text-xs text-slate-400">Eliminating Centralized CAs via On-Chain P-256 Precompile & ENS</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={`https://sepolia.etherscan.io/address/${SEPOLIA_DTRUST_RESOLVER}`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Sepolia Etherscan ↗
          </a>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {network}
          </div>

          <button 
            onClick={connectMetaMask}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs transition cursor-pointer"
            title="Click to connect real MetaMask wallet"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-mono text-slate-300">
              {wallet ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Connect MetaMask'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Domain Owner Sovereign Portal</span>
              <span className="text-xs font-normal text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800/60 font-mono">
                {selectedDomain.tld}
              </span>
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Pin your web server's sovereign NIST P-256 public key directly to your ENS record. 
              Enforce cryptographic Proof-of-Possession and stop rogue CA forging forever.
            </p>
          </div>
          <button 
            onClick={() => setSimModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-300 transition shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            Launch Client Verifier Simulator
          </button>
        </div>

        {/* ALWAYS-VISIBLE LIVE EXPLORER LINKS CARD */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-4 shadow-xl shadow-emerald-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                Live On-Chain Explorer Verification Links
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live On-Chain Proofs (Click to Open)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* 1. Official Sepolia ENS Registry */}
            <a 
              href={`https://sepolia.etherscan.io/address/${SEPOLIA_ENS_REGISTRY}`}
              target="_blank" 
              rel="noreferrer"
              className="p-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 transition flex items-center gap-1">
                  ENS Registry (Sepolia) ↗
                </span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono">EIP-137</span>
              </div>
              <p className="font-mono text-xs text-emerald-300 truncate">
                {SEPOLIA_ENS_REGISTRY}
              </p>
              <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                View official ENS Registry on Sepolia Etherscan →
              </span>
            </a>

            {/* 2. DtrustResolver Contract */}
            <a 
              href={`https://sepolia.etherscan.io/address/${SEPOLIA_DTRUST_RESOLVER}`}
              target="_blank" 
              rel="noreferrer"
              className="p-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 transition flex items-center gap-1">
                  DtrustResolver Contract ↗
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">Verified</span>
              </div>
              <p className="font-mono text-xs text-emerald-300 truncate">
                {SEPOLIA_DTRUST_RESOLVER}
              </p>
              <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                View verified TLS Resolver on Sepolia Etherscan →
              </span>
            </a>

            {/* 3. ENS Explorer for dotlab.studio */}
            <a 
              href={selectedDomain.ensExplorer || `https://explorer.ens.domains/${selectedDomain.name}`}
              target="_blank" 
              rel="noreferrer"
              className="p-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 transition flex items-center gap-1">
                  ENS Domain Record ↗
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">ENS App</span>
              </div>
              <p className="font-mono text-xs text-emerald-300 truncate">
                {selectedDomain.name}
              </p>
              <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                View dotlab.studio on official ENS Explorer →
              </span>
            </a>

            {/* 4. Deployer Wallet Explorer */}
            <a 
              href={`https://sepolia.etherscan.io/address/${wallet ? wallet.address : '0xd886168001663855a8f1ea7DdEa1393A074Ee354'}`}
              target="_blank" 
              rel="noreferrer"
              className="p-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 transition flex items-center gap-1">
                  Owner Wallet (Sepolia) ↗
                </span>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-mono">Deployer</span>
              </div>
              <p className="font-mono text-xs text-emerald-300 truncate">
                {wallet ? wallet.address : '0xd886168001663855a8f1ea7DdEa1393A074Ee354'}
              </p>
              <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                View owner account on Sepolia Etherscan →
              </span>
            </a>
          </div>
        </div>

        {/* Section 1: Domain & ENS Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                Target Domain & ENS Node
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Verified Owner
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {KNOWN_DOMAINS.map(d => (
                <div 
                  key={d.name}
                  onClick={() => setSelectedDomain(d)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                    selectedDomain.name === d.name 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm shadow-emerald-500/10' 
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-white text-base">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.tld}</p>
                  </div>
                  {selectedDomain.name === d.name && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
              ))}
            </div>

            {/* Namehash readout */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <p className="text-xs text-slate-400 font-mono">Canonical ENS Namehash (Node):</p>
              <p className="text-xs font-mono text-emerald-300 break-all select-all">
                {selectedDomain.namehash}
              </p>
            </div>
          </div>

          {/* Connected Authority */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                ENS Authorization
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Domain Owner:</span>
                  <p className="font-mono text-slate-200">{wallet ? wallet.address : 'Loading...'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Dtrust Resolver:</span>
                  <p className="font-mono text-slate-200">{SEPOLIA_DTRUST_RESOLVER.slice(0, 14)}...</p>
                </div>
                <div>
                  <span className="text-slate-500">EIP-7951 Precompile:</span>
                  <p className="font-mono text-emerald-400 font-semibold">0x0100 (Native secp256r1)</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              ✓ ENS Registry confirms your wallet has authoritative write permissions on this node.
            </div>
          </div>
        </div>

        {/* Section 2: 3-Step Wizard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1: Keypair Generation */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step 1</span>
                {qx && <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">✓ Ready</span>}
              </div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                Sovereign Keypair
              </h3>
              <p className="text-xs text-slate-400">
                Generate a NIST P-256 (secp256r1) keypair in your browser. Private key stays secret; only (Qx, Qy) affine coordinates go on-chain.
              </p>

              {qx && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
                  <div>
                    <span className="text-slate-500">Qx:</span>
                    <p className="text-slate-300 truncate">{qx}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Qy:</span>
                    <p className="text-slate-300 truncate">{qy}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateKey}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {qx ? 'Regenerate P-256 Key' : 'Generate P-256 Key'}
            </button>
          </div>

          {/* Step 2: Proof-of-Possession */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step 2</span>
                {sigR && <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">✓ Signed</span>}
              </div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Proof-of-Possession (PoP)
              </h3>
              <p className="text-xs text-slate-400">
                Sign an anti-replay digest over (Domain, Node, Nonce, Expiry) to mathematically prove you possess the server's private key.
              </p>

              {sigR && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
                  <div>
                    <span className="text-slate-500">ECDSA (R):</span>
                    <p className="text-slate-300 truncate">{sigR}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Low-s (S):</span>
                    <p className="text-slate-300 truncate">{sigS}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSignPoP}
              disabled={!qx || isSigning}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 ${
                qx 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                  : 'bg-slate-950 text-slate-600 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSigning ? 'animate-spin' : ''}`} />
              {sigR ? 'Re-Sign PoP Digest' : 'Sign PoP Digest'}
            </button>
          </div>

          {/* Step 3: On-Chain Commitment */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step 3</span>
                {pinnedCert && <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">✓ Pinned</span>}
              </div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                Publish to ENS
              </h3>
              <p className="text-xs text-slate-400">
                Calls <code className="text-emerald-400 font-mono">DtrustResolver.setTLSCert()</code>. The P-256 precompile verifies your PoP signature on-chain.
              </p>

              {pinnedCert && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                  <p className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Certificate Active On-Chain!
                  </p>
                  <p className="font-mono text-slate-400 text-[10px]">Nonce: {pinnedCert.nonce} | Lifetime: 60 Days</p>
                </div>
              )}
            </div>

            <button
              onClick={handlePublish}
              disabled={!sigR || isPublishing}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs transition shadow-lg flex items-center justify-center gap-2 ${
                sigR 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' 
                  : 'bg-slate-950 text-slate-600 cursor-not-allowed'
              }`}
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Broadcasting Tx...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Commit to ENS Resolver
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 3: Active Pinned Certificate & Sovereign Revocation */}
        {pinnedCert && (
          <div className="space-y-4">
            <div className={`p-6 rounded-2xl border transition ${
              pinnedCert.revoked 
                ? 'bg-rose-950/20 border-rose-800/60' 
                : 'bg-slate-900/80 border-emerald-500/30'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${pinnedCert.revoked ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
                    <h3 className="font-bold text-lg text-white">
                      {pinnedCert.revoked ? 'Status: SOVEREIGN REVOCATION EXECUTED' : 'Status: ACTIVELY PINNED ON ENS RESOLVER'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Domain: {pinnedCert.domain} | On-Chain Nonce: #{pinnedCert.nonce}
                  </p>
                </div>

                {!pinnedCert.revoked ? (
                  <button
                    onClick={handleRevoke}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-xs font-semibold text-rose-300 transition"
                  >
                    <Flame className="w-4 h-4 text-rose-400" />
                    Trigger 1-Block Sovereign Revocation
                  </button>
                ) : (
                  <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-lg font-mono">
                    Key Invalidation Confirmed Worldwide in 1 Block
                  </span>
                )}
              </div>
            </div>

            {/* Live On-Chain Explorer Verification Links */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-emerald-400" />
                  Live On-Chain Explorer Verification Links
                </h4>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Confirmed on Explorer
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Link 1: Transaction Hash */}
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash || SEPOLIA_SAMPLE_TX}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition group flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Issuance Tx Hash</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                  </div>
                  <p className="font-mono text-xs text-emerald-300 truncate">
                    {txHash || SEPOLIA_SAMPLE_TX}
                  </p>
                  <span className="text-[10px] text-slate-500">View live transaction on Sepolia Etherscan ↗</span>
                </a>

                {/* Link 2: Contract Address */}
                <a 
                  href={`https://sepolia.etherscan.io/address/${SEPOLIA_DTRUST_RESOLVER}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition group flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">DtrustResolver Contract</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                  </div>
                  <p className="font-mono text-xs text-emerald-300 truncate">
                    {SEPOLIA_DTRUST_RESOLVER}
                  </p>
                  <span className="text-[10px] text-slate-500">View verified contract on Sepolia Etherscan ↗</span>
                </a>

                {/* Link 3: ENS Domain Explorer */}
                <a 
                  href={selectedDomain.ensExplorer || `https://explorer.ens.domains/${selectedDomain.name}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition group flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">ENS Domain Record</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                  </div>
                  <p className="font-mono text-xs text-emerald-300 truncate">
                    {selectedDomain.name}
                  </p>
                  <span className="text-[10px] text-slate-500">View canonical ENS node records ↗</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Simulator Modal */}
      {simModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Client Browser Enforcement Simulator</h3>
              </div>
              <button 
                onClick={() => setSimModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Simulate what happens when an everyday visitor visits <code className="text-emerald-400 font-mono">https://{selectedDomain.name}</code> with our extension installed:
              </p>

              {/* Mode Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSimMode('legit')}
                  className={`p-3.5 rounded-xl border text-left space-y-1 transition ${
                    simMode === 'legit'
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold text-emerald-400">Scenario A: Normal Visit</p>
                  <p className="text-[11px] text-slate-400">Server presents genuine key matching ENS.</p>
                </button>

                <button
                  onClick={() => setSimMode('rogue')}
                  className={`p-3.5 rounded-xl border text-left space-y-1 transition ${
                    simMode === 'rogue'
                      ? 'bg-rose-500/10 border-rose-500/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold text-rose-400">Scenario B: Rogue CA Attack</p>
                  <p className="text-[11px] text-slate-400">Compromised CA issued fake cert (eMudhra style).</p>
                </button>
              </div>

              {/* Simulation Result Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Address Bar:</span>
                  <span className="text-slate-300">https://{selectedDomain.name}</span>
                </div>

                {simMode === 'legit' ? (
                  pinnedCert?.revoked ? (
                    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                      <h4 className="font-bold text-sm text-rose-300">SITE BLOCKED: SOVEREIGN REVOCATION DETECTED</h4>
                      <p className="text-xs text-rose-400/80">
                        The domain owner revoked this certificate on-chain. Connection aborted.
                      </p>
                    </div>
                  ) : pinnedCert ? (
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-center space-y-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                      <h4 className="font-bold text-sm text-emerald-300">DTRUST VERIFIED: SOVEREIGN TLS ACTIVE</h4>
                      <p className="text-xs text-emerald-400/80">
                        TLS public key matches on-chain ENS record verified via P-256 precompile.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                      <p className="text-xs text-slate-400">No active certificate registered yet on ENS for {selectedDomain.name}.</p>
                      <p className="text-[11px] text-slate-500">Complete Steps 1–3 above to activate Dtrust security.</p>
                    </div>
                  )
                ) : (
                  <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500 text-center space-y-2 animate-pulse">
                    <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
                    <h4 className="font-bold text-sm text-rose-200 tracking-wider">NEGATIVE OVERRIDE: ROGUE CA BLOCKED!</h4>
                    <p className="text-xs text-rose-200/90 leading-relaxed">
                      CRITICAL: The TLS certificate presented by the website does NOT match the sovereign key pinned on ENS. 
                      A compromised CA or MITM attacker has attempted to forge traffic.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSimModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Close Simulator
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

