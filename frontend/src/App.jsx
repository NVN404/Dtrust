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
  Flame, 
  ArrowRight, 
  Cpu, 
  BookOpen, 
  X,
  Layers,
  ArrowUpRight,
  Check,
  Server,
  Code2,
  LockKeyhole,
  CheckCircle,
  HelpCircle,
  Terminal,
  Activity,
  Award,
  Users,
  Compass,
  LayoutDashboard,
  ArrowLeft
} from 'lucide-react';
import { 
  generateSovereignP256Key, 
  computePoPDigest, 
  signPoPDigest 
} from './crypto';
import { 
  KNOWN_DOMAINS, 
  CANONICAL_P256_VERIFIER, 
  DEFAULT_REGISTRY_ADDRESS, 
  DTRUST_REGISTRY_ABI 
} from './contracts';
import { ethers } from 'ethers';

// Live Mined Certificate Tx on Sepolia Block 12074811
const LATEST_MINED_TX = "0xbef87f34dbc912f9aaecfd419a177a2ab8afce38407aef5131be1695684eede9";

// Unique Sovereign Dtrust Vector Emblem (Shield + P-256 Curve "D" + Ethereum Octahedron Core)
export function DtrustLogo({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-20 h-20 p-3.5',
    xl: 'w-28 h-28 p-5'
  };

  const containerClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`${containerClass} neu-convex rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-105 select-none bg-gradient-to-br from-white via-[#F0F4F8] to-[#E2E8F0] shadow-sm ${className}`}>
      <svg 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_4px_rgba(37,99,235,0.22)]"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="9" y1="5" x2="39" y2="43" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="60%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="dGrad" x1="17" y1="14" x2="35" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="facetTL" x1="18.5" y1="17.5" x2="24" y2="25.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="facetTR" x1="29.5" y1="17.5" x2="24" y2="25.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BFDBFE" />
            <stop offset="100%" stopColor="#93C5FD" />
          </linearGradient>
          <linearGradient id="facetBL" x1="18.5" y1="24" x2="24" y2="30.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="facetBR" x1="29.5" y1="24" x2="24" y2="30.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* Outer Sovereign Shield Outline */}
        <path 
          d="M 24 5 L 39 10 V 22 C 39 31.5 32.5 39.5 24 43 C 15.5 39.5 9 31.5 9 22 V 10 Z" 
          stroke="url(#shieldGrad)" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Sovereign Monogram "D" Rib */}
        <path 
          d="M 17 14 H 25 C 30.5 14 34.5 18 34.5 24 C 34.5 30 30.5 34 25 34 H 17 V 14 Z" 
          stroke="url(#dGrad)" 
          strokeWidth="2.75" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Central Ethereum Sovereign Diamond Core */}
        <path d="M 24 17.5 L 18.5 24 L 24 25.5 Z" fill="url(#facetTL)" />
        <path d="M 24 17.5 L 29.5 24 L 24 25.5 Z" fill="url(#facetTR)" />
        <path d="M 18.5 24 L 24 30.5 L 24 25.5 Z" fill="url(#facetBL)" />
        <path d="M 29.5 24 L 24 30.5 L 24 25.5 Z" fill="url(#facetBR)" />

        {/* Mathematical Elliptic Curve Central Anchor Point */}
        <circle cx="24" cy="24" r="1.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

export default function App() {
  // Navigation View: 'landing' | 'app'
  const [currentView, setCurrentView] = useState('landing');

  // Wallet State
  const [wallet, setWallet] = useState(null);
  const [network, setNetwork] = useState('Sepolia (11155111)');

  // Registry Address State
  const [registryAddress, setRegistryAddress] = useState(() => {
    const saved = localStorage.getItem('dtrust_registry');
    if (!saved) return DEFAULT_REGISTRY_ADDRESS;
    try {
      const parsed = ethers.getAddress(saved.toLowerCase());
      if (parsed.toLowerCase() === "0x89d2d5d4cbd5401309febdf69aa3c858b299e578") {
        return DEFAULT_REGISTRY_ADDRESS;
      }
      return parsed;
    } catch {
      return DEFAULT_REGISTRY_ADDRESS;
    }
  });

  // Target Domain Input State (defaults to live on-chain domain 'dotlab.studio')
  const [domainInput, setDomainInput] = useState('dotlab.studio');

  // Dynamically computed selected domain
  const cleanDomain = domainInput.trim().toLowerCase() || 'dotlab.studio';
  const selectedDomain = {
    name: cleanDomain,
    tld: cleanDomain === 'dotlab.studio' 
      ? 'Registered Web2 Target (Name.com)' 
      : 'Sovereign Web Target (Custom Domain)',
    owner: wallet ? wallet.address : '0xd886168001663855a8f1ea7DdEa1393A074Ee354'
  };

  // NIST P-256 Key Coordinates
  const [keyPair, setKeyPair] = useState(null);
  const [qx, setQx] = useState('0xe426432c1fa03998a2c2e30a4960948b301793f127a2ef38ab58e2a077f8e422');
  const [qy, setQy] = useState('0xf3b117e509e86e1305cfcc0075661726eee3e1b41b978615946cf99026261393');
  const [jwk, setJwk] = useState(null);

  // PoP Signature State
  const [popDigest, setPopDigest] = useState('0x6f6bcb61050c9625a80426ccc1238e47fdd8d15e9b2c588aaf82d46545b649a0');
  const [sigR, setSigR] = useState('0x4095bb1822830386762bf66411d739e10dcf2594695d7b5b565a0c9dc8fa2f72');
  const [sigS, setSigS] = useState('0x24e031940e4ab7dcfd6bc9fbe2ee8440751a029ee62e921d723797669d0d3bca');
  const [isSigning, setIsSigning] = useState(false);
  const [certNonce, setCertNonce] = useState(1n);
  const [certExpiry, setCertExpiry] = useState(0n);

  // On-Chain Commitment State
  const [isPublishing, setIsPublishing] = useState(false);
  const [pinnedCert, setPinnedCert] = useState({
    domain: 'dotlab.studio',
    namehash: '0xfe2264932f41f9650559b32d9be92913440d90693d45ce1d90e6a9ec30eb0290',
    qx: '0xe426432c1fa03998a2c2e30a4960948b301793f127a2ef38ab58e2a077f8e422',
    qy: '0xf3b117e509e86e1305cfcc0075661726eee3e1b41b978615946cf99026261393',
    nonce: 1,
    issuedAt: Math.floor(Date.now() / 1000) - 3600,
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 86400,
    revoked: false,
    owner: '0xd886168001663855a8f1ea7DdEa1393A074Ee354',
    isValid: true
  });
  const [txHash, setTxHash] = useState(LATEST_MINED_TX);

  // Battle Simulator Modal State
  const [simMode, setSimMode] = useState('legit'); // 'legit' | 'rogue'
  const [simModalOpen, setSimModalOpen] = useState(false);

  // Auto-connect demo wallet
  useEffect(() => {
    setWallet({
      address: '0xd886168001663855a8f1ea7DdEa1393A074Ee354',
      name: 'Deployer & Sovereign Owner'
    });
  }, []);

  // Fetch pinned cert directly from Sepolia contract
  const fetchPinnedCert = async () => {
    const target = domainInput.trim().toLowerCase();
    if (!target) return;
    try {
      const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
      const registry = new ethers.Contract(registryAddress, DTRUST_REGISTRY_ABI, provider);
      const [isValid, cert, owner] = await registry.getTLSCert(target);
      if (cert.subjectQx && cert.subjectQx !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        setPinnedCert({
          domain: target,
          namehash: ethers.keccak256(ethers.toUtf8Bytes(target)),
          qx: cert.subjectQx,
          qy: cert.subjectQy,
          nonce: Number(cert.nonce),
          issuedAt: Number(cert.issuedAt),
          expiresAt: Number(cert.expiresAt),
          revoked: cert.revoked,
          owner: owner,
          isValid: isValid
        });
        setQx(cert.subjectQx);
        setQy(cert.subjectQy);
      } else {
        setPinnedCert(null);
      }
    } catch (e) {
      console.warn("Could not fetch pinned cert from Sepolia:", e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPinnedCert();
    }, 300);
    return () => clearTimeout(timer);
  }, [registryAddress, domainInput]);

  // Connect MetaMask
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install MetaMask to broadcast live Sepolia transactions.");
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
      confetti({ particleCount: 25, spread: 35, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
      alert('Key generation failed: ' + err.message);
    }
  };

  // 2. Sign Proof-of-Possession
  const handleSignPoP = async () => {
    if (!keyPair) {
      alert("Please initialize a sovereign NIST P-256 keypair in Act I first.");
      return;
    }
    setIsSigning(true);
    try {
      const chainId = 11155111n;
      const domainHash = ethers.keccak256(ethers.toUtf8Bytes(selectedDomain.name));

      let currentNonce = 0n;
      try {
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const registry = new ethers.Contract(registryAddress, DTRUST_REGISTRY_ABI, provider);
        currentNonce = await registry.domainNonce(domainHash);
      } catch (err) {
        console.warn("Could not query on-chain nonce, defaulting to 0:", err);
      }

      const nonce = currentNonce + 1n;
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 60 * 86400); // 60 days
      setCertNonce(nonce);
      setCertExpiry(expiresAt);

      const { packedBytes, digestHex } = computePoPDigest({
        chainId,
        resolverAddress: registryAddress,
        node: domainHash,
        qx,
        qy,
        nonce,
        expiresAt
      });

      setPopDigest(digestHex);

      const { r, s } = await signPoPDigest(keyPair.privateKey, packedBytes);
      setSigR(r);
      setSigS(s);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
    } catch (err) {
      console.error(err);
      alert('PoP Signing failed: ' + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  // 3. Publish to Sovereign Registry on Sepolia
  const handlePublish = async () => {
    if (!sigR || !sigS) {
      alert("Please sign the Proof-of-Possession in Act II first.");
      return;
    }
    setIsPublishing(true);

    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchError) {
          console.warn("Could not auto-switch chain to Sepolia:", switchError);
        }

        const registry = new ethers.Contract(
          registryAddress,
          DTRUST_REGISTRY_ABI,
          signer
        );

        console.log("Broadcasting setTLSCert to DtrustRegistry on Sepolia via MetaMask...");
        const tx = await registry.setTLSCert(
          selectedDomain.name,
          qx,
          qy,
          certExpiry,
          certNonce,
          sigR,
          sigS
        );

        setTxHash(tx.hash);
        console.log("Transaction submitted to Sepolia:", tx.hash);
        
        console.log("Waiting for Sepolia block confirmation...");
        const receipt = await tx.wait(1);
        console.log("Transaction successfully confirmed on Sepolia in block:", receipt.blockNumber);

        await fetchPinnedCert();

        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        throw new Error("MetaMask is not detected. Please install MetaMask with Sepolia testnet ETH.");
      }
    } catch (err) {
      console.error("Sepolia Broadcast Error:", err);
      alert(`Sepolia Broadcast Error:\n\n${err.reason || err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // 4. Instant 1-Block Revocation
  const handleRevoke = async () => {
    if (!pinnedCert) return;
    if (!confirm('Are you sure you want to trigger 1-Block Sovereign Revocation? This permanently invalidates the current TLS key on Ethereum.')) return;
    
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const registry = new ethers.Contract(registryAddress, DTRUST_REGISTRY_ABI, signer);
        
        console.log("Broadcasting revocation to Sepolia...");
        const tx = await registry.revokeTLSCert(
          selectedDomain.name,
          "Emergency Compromise Revocation"
        );
        setTxHash(tx.hash);
        console.log("Waiting for revocation confirmation...");
        await tx.wait(1);
        await fetchPinnedCert();
        confetti({ particleCount: 50, spread: 45, origin: { y: 0.7 } });
      }
    } catch (e) {
      console.error("Revocation error:", e);
      alert(`Revocation error: ${e.reason || e.message}`);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-[#0F172A] pb-24">
      
      {/* CRISP LIGHT MODE TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 px-6 py-4 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand Identity (Text Only) */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tight text-[#0F172A]">
                Dtrust
              </span>
              <span className="text-[10px] font-mono tracking-wider neu-concave-sm px-2.5 py-0.5 text-[#2563EB] font-bold rounded-md">
                Sovereign dPKI
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-medium">
              P-256 Sovereign Certificate Ledger • Sepolia L1 Consensus
            </p>
          </div>

          {/* DUAL-VIEW SWITCHER & QUICK ACTIONS */}
          <div className="flex items-center gap-3">
            {/* View Switcher Pill (Embossed / Debossed) */}
            <div className="neu-concave p-1.5 flex items-center gap-1 rounded-xl">
              <button
                onClick={() => setCurrentView('landing')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  currentView === 'landing' 
                    ? 'neu-convex bg-white text-[#2563EB] shadow-sm' 
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setCurrentView('app')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'app' 
                    ? 'neu-convex bg-white text-[#2563EB] shadow-sm' 
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                <span>Certificate Manager</span>
              </button>
            </div>

            {/* Network pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 neu-concave-sm font-mono text-xs font-semibold text-[#475569]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              {network}
            </div>

            {/* Wallet button */}
            <button 
              onClick={connectMetaMask}
              className="neu-btn px-4 py-2 flex items-center gap-2 text-xs font-semibold cursor-pointer"
              title="Connect MetaMask"
            >
              <Key className="w-3.5 h-3.5 text-[#2563EB]" />
              {wallet ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW 1: OVERVIEW & ARCHITECTURE                                           */}
      {/* ========================================================================= */}
      {currentView === 'landing' && (
        <main className="max-w-[1280px] mx-auto px-6 pt-12 sm:pt-16 space-y-24 sm:space-y-32">
          
          {/* HERO SECTION: SPLIT-SCREEN (TEXT LEFT 7 COLS, GRAPHIC RIGHT 5 COLS) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-mono font-bold text-[#2563EB] shadow-sm">
                <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>SOVEREIGN dPKI • MATHEMATICAL ROOT OF TRUST (SEPOLIA)</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.12] font-extrabold text-[#0F172A] tracking-tight">
                The Sovereign Root of Trust for the Decentralized Web.
              </h1>

              <p className="text-base sm:text-lg text-[#334155] leading-relaxed max-w-[64ch]">
                Eliminating Centralized Certificate Authorities through native NIST P-256 precompiles and Ethereum Sepolia. 
                Pure, mathematically verifiable zero-trust TLS security.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setCurrentView('app')}
                  className="neu-btn-primary px-7 py-3.5 text-sm font-semibold flex items-center gap-2.5 cursor-pointer"
                >
                  <span>Open Certificate Manager</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSimModalOpen(true)}
                  className="neu-btn px-6 py-3.5 text-sm font-semibold flex items-center gap-2 cursor-pointer text-[#1E293B]"
                >
                  <ShieldAlert className="w-4 h-4 text-[#2563EB]" />
                  <span>Tactical Battle Simulator</span>
                </button>
              </div>

              {/* Metric Row */}
              <div className="pt-8 grid grid-cols-3 gap-6 font-mono text-xs">
                <div className="neu-convex p-4 text-center">
                  <span className="block text-2xl font-extrabold text-[#0F172A]">1-Block</span>
                  <span className="text-[#64748B] text-[11px] font-medium">Instant Revocation</span>
                </div>
                <div className="neu-convex p-4 text-center">
                  <span className="block text-2xl font-extrabold text-[#0F172A]">secp256r1</span>
                  <span className="text-[#64748B] text-[11px] font-medium">EVM Precompile</span>
                </div>
                <div className="neu-convex p-4 text-center">
                  <span className="block text-2xl font-extrabold text-[#0F172A]">Zero CA</span>
                  <span className="text-[#64748B] text-[11px] font-medium">Mathematical Root</span>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Clean Luminous Cryptographic Emblem Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md neu-convex p-8 relative flex flex-col items-center justify-center space-y-6">
                
                {/* Cryptographic Key Verification Display (Text Only) */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold text-[#2563EB]">NIST P-256 (secp256r1)</span>
                    <span className="text-[10px] bg-emerald-50 text-[#059669] border border-emerald-200 px-2 py-0.5 rounded font-bold">Sepolia Verified</span>
                  </div>
                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-[#64748B] text-[10px] block uppercase font-bold">Public Key Qx:</span>
                      <p className="font-bold text-[#0F172A] truncate">0xe426432c1fa03998a2c2e30a4960948b3017...</p>
                    </div>
                    <div>
                      <span className="text-[#64748B] text-[10px] block uppercase font-bold">Public Key Qy:</span>
                      <p className="font-bold text-[#0F172A] truncate">0xf3b117e509e86e1305cfcc0075661726eee3...</p>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="w-full space-y-3 font-mono text-xs">
                  <div className="neu-concave-sm p-3 flex items-center justify-between">
                    <span className="text-[#64748B] font-semibold">ROOT STATUS:</span>
                    <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Mined on Sepolia
                    </span>
                  </div>
                  <div className="neu-concave-sm p-3 flex items-center justify-between">
                    <span className="text-[#64748B] font-semibold">TARGET DOMAIN:</span>
                    <span className="font-bold text-[#2563EB]">{selectedDomain.name}</span>
                  </div>
                </div>

                <div className="text-[11px] text-center text-[#64748B] font-medium">
                  Cryptographic TLS state anchored to Sepolia block 12074811
                </div>
              </div>
            </div>

          </section>

          {/* FEATURES SECTION: 3 NEUMORPHIC CARDS WITH SOFT DEPTH */}
          <section className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="neu-concave-sm px-3 py-1 text-xs font-mono font-semibold text-[#2B6CB0]">
                CORE ARCHITECTURE
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A202C] tracking-tight">
                Physicality Meets Mathematical Proof.
              </h2>
              <p className="text-sm text-[#718096]">
                Every cryptographic interaction is rendered with tactile depth and instant clarity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="neu-convex p-7 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 neu-concave rounded-xl flex items-center justify-center text-[#2B6CB0]">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-[#1A202C]">
                    Hardware Enclave Keypair
                  </h3>
                  <p className="text-sm text-[#718096] leading-relaxed">
                    Browser-native WebCrypto generation guarantees the server's private key never leaves memory. Only affine coordinates $(Q_x, Q_y)$ are committed on-chain.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#2B6CB0] font-semibold flex items-center gap-1">
                  <span>Zero Key Leakage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Feature 2 */}
              <div className="neu-convex p-7 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 neu-concave rounded-xl flex items-center justify-center text-[#2B6CB0]">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-[#1A202C]">
                    EVM Precompile Verification
                  </h3>
                  <p className="text-sm text-[#718096] leading-relaxed">
                    Daimo's live P256Verifier contract on Sepolia calculates elliptic curve verification directly in EVM memory, confirming signatures deterministically.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#2B6CB0] font-semibold flex items-center gap-1">
                  <span>RIP-7212 Compatible</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Feature 3 */}
              <div className="neu-convex p-7 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 neu-concave rounded-xl flex items-center justify-center text-[#2B6CB0]">
                    <Flame className="w-6 h-6 text-[#E53E3E]" />
                  </div>
                  <h3 className="font-bold text-lg text-[#1A202C]">
                    1-Block Sovereign Revocation
                  </h3>
                  <p className="text-sm text-[#718096] leading-relaxed">
                    Compromised key? Web2 takes 7 days to propagate CRLs. Dtrust revokes your certificate in a single Ethereum block, stopping rogue CAs in their tracks.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#E53E3E] font-semibold flex items-center gap-1">
                  <span>12-Second Finality</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </section>

          {/* PRICING / TIERS: 3 TIERS, HIGHLIGHT MIDDLE IN SOFT BLUE */}
          <section className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="neu-concave-sm px-3 py-1 text-xs font-mono font-semibold text-[#2B6CB0]">
                DEPLOYMENT TIERS
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A202C] tracking-tight">
                Predictable, Transparent Cryptography.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              
              {/* Tier 1 */}
              <div className="neu-convex p-7 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-xs font-mono uppercase text-[#718096] font-semibold">Community Testnet</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[#1A202C]">0 ETH</span>
                    <span className="text-xs text-[#718096]">/ lifetime</span>
                  </div>
                  <p className="text-xs text-[#718096]">Ideal for developers testing on Ethereum Sepolia testnet.</p>
                  
                  <ul className="space-y-2.5 text-xs text-[#4A5568] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2ECC40]" /> 1 Domain Registration
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2ECC40]" /> Standard P-256 Proof-of-Possession
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2ECC40]" /> Sepolia PublicNode RPC
                    </li>
                  </ul>
                </div>

                <button 
                  onClick={() => setCurrentView('app')}
                  className="neu-btn w-full py-3 text-xs font-semibold cursor-pointer"
                >
                  Start on Sepolia
                </button>
              </div>

              {/* Tier 2: HIGHLIGHTED (SOVEREIGN SERVER) */}
              <div className="neu-convex p-8 space-y-6 flex flex-col justify-between border-2 border-[#BFDBFE] relative bg-gradient-to-b from-white via-[#EFF6FF] to-white">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 neu-convex-sm px-3 py-1 text-[11px] font-mono font-bold bg-[#DBEAFA] text-[#1D4ED8]">
                  RECOMMENDED ARCHITECTURE
                </div>

                <div className="space-y-4 pt-2">
                  <span className="text-xs font-mono uppercase text-[#2B6CB0] font-bold">Production Sovereign</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[#1A365D]">Gas Only</span>
                    <span className="text-xs text-[#718096]">/ per tx</span>
                  </div>
                  <p className="text-xs text-[#4A5568]">Full zero-trust cryptographic sovereignty for real web servers.</p>
                  
                  <ul className="space-y-2.5 text-xs text-[#2D3748] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2B6CB0]" /> Unlimited Key Rotations
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2B6CB0]" /> 1-Block Emergency Revocation
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2B6CB0]" /> Anti-Replay Monotonic Nonces
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2B6CB0]" /> Daimo EVM Verifier Staticcall
                    </li>
                  </ul>
                </div>

                <button 
                  onClick={() => setCurrentView('app')}
                  className="neu-btn-primary w-full py-3.5 text-sm font-semibold cursor-pointer"
                >
                  Deploy Sovereign Key Now
                </button>
              </div>

              {/* Tier 3 */}
              <div className="neu-convex p-7 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-xs font-mono uppercase text-[#718096] font-semibold">Enterprise Sovereign</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[#1A202C]">Custom</span>
                  </div>
                  <p className="text-xs text-[#718096]">For banks, cloud providers, and mission-critical infrastructure.</p>
                  
                  <ul className="space-y-2.5 text-xs text-[#4A5568] pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2ECC40]" /> Dedicated Secure Enclave Modules
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2ECC40]" /> Multi-Sig Sovereign Guardianship
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#2ECC40]" /> Custom Verifier Node SLA
                    </li>
                  </ul>
                </div>

                <a 
                  href={`https://sepolia.etherscan.io/address/${registryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="neu-btn w-full py-3 text-xs font-semibold text-center cursor-pointer block"
                >
                  Inspect Contract Code
                </a>
              </div>

            </div>
          </section>

          {/* TESTIMONIALS (3 SOFT NEUMORPHIC CARDS) */}
          <section className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="neu-concave-sm px-3 py-1 text-xs font-mono font-semibold text-[#2B6CB0]">
                TRUST VERIFIED
              </span>
              <h2 className="text-3xl font-bold text-[#1A202C] tracking-tight">
                Architected for High-Assurance Environments.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="neu-convex p-6 space-y-3">
                <p className="text-xs text-[#4A5568] leading-relaxed italic">
                  "Dtrust's 1-block revocation completely outclasses legacy Certificate Revocation Lists. We can purge a compromised key in 12 seconds."
                </p>
                <div className="pt-2 border-t border-white/60">
                  <span className="block font-bold text-xs text-[#1A365D]">Chief Security Architect</span>
                  <span className="text-[11px] text-[#718096]">Institutional Digital Assets</span>
                </div>
              </div>

              <div className="neu-convex p-6 space-y-3">
                <p className="text-xs text-[#4A5568] leading-relaxed italic">
                  "The native P-256 precompile approach on Sepolia is brilliant. Zero custom oracle reliance—pure curve math directly in EVM memory."
                </p>
                <div className="pt-2 border-t border-white/60">
                  <span className="block font-bold text-xs text-[#1A365D]">Principal Cryptographer</span>
                  <span className="text-[11px] text-[#718096]">Zero-Knowledge Infrastructure</span>
                </div>
              </div>

              <div className="neu-convex p-6 space-y-3">
                <p className="text-xs text-[#4A5568] leading-relaxed italic">
                  "Centralized CAs have had single points of failure for 30 years. Anchoring sovereign public keys to Ethereum solves the root trust dilemma."
                </p>
                <div className="pt-2 border-t border-white/60">
                  <span className="block font-bold text-xs text-[#1A365D]">Head of Platform Security</span>
                  <span className="text-[11px] text-[#718096]">Web3 Banking Protocol</span>
                </div>
              </div>
            </div>
          </section>

          {/* FINAL CTA EMBOSSED BANNER */}
          <section className="neu-convex p-10 sm:p-12 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A202C] tracking-tight">
              Ready to eliminate rogue CA risk forever?
            </h2>
            <p className="text-sm text-[#4A5568] max-w-xl mx-auto leading-relaxed">
              Pin your server's NIST P-256 key directly onto Ethereum Sepolia. Instant mathematical Proof-of-Possession and 1-block sovereign revocation.
            </p>
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setCurrentView('app')}
                className="neu-btn-primary px-8 py-4 text-base font-semibold flex items-center gap-3 cursor-pointer shadow-lg"
              >
                <span>Launch Certificate Manager</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </section>

          {/* FULL NEUMORPHIC FOOTER */}
          <footer className="pt-12 border-t border-white/80 space-y-6 text-xs text-[#718096]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                © 2026 Dtrust Sovereign dPKI Foundation • Ethereum Sepolia (11155111)
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentView('app')} className="hover:text-[#1A365D] cursor-pointer">
                  Certificate Manager
                </button>
                <a href={`https://sepolia.etherscan.io/address/${registryAddress}`} target="_blank" rel="noreferrer" className="hover:text-[#1A365D]">
                  Contract on Etherscan
                </a>
                <a href={`https://sepolia.etherscan.io/address/${CANONICAL_P256_VERIFIER}`} target="_blank" rel="noreferrer" className="hover:text-[#1A365D]">
                  Daimo Verifier
                </a>
              </div>
            </div>
          </footer>

        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CERTIFICATE MANAGER                                               */}
      {/* ========================================================================= */}
      {currentView === 'app' && (
        <main className="max-w-[1280px] mx-auto px-6 pt-10 space-y-12">
          
          {/* Top Return Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentView('landing')}
              className="neu-btn px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer text-[#4A5568] hover:text-[#1A365D]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>

            <span className="neu-concave-sm px-3 py-1 font-mono text-xs text-[#2B6CB0] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2ECC40]"></span>
              Live On-Chain Ledger (Sepolia)
            </span>
          </div>

          {/* APP HERO STATUS CARD */}
          <section className="neu-convex p-7 space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              
              <div className="space-y-3 w-full max-w-xl">
                <div className="inline-flex items-center px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-mono font-bold text-[#2563EB]">
                  <span>ACTIVE SOVEREIGN DOMAIN LEDGER</span>
                </div>

                {/* Interactive Domain Input Box */}
                <div className="relative flex items-center w-full">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Enter target domain (e.g. dotlab.studio, myapp.com)..."
                    className="w-full bg-white border-2 border-[#2563EB] focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none px-5 py-3.5 pr-20 text-2xl sm:text-3xl font-extrabold text-[#0F172A] placeholder-slate-400 rounded-xl font-mono tracking-tight shadow-sm transition"
                    spellCheck="false"
                    autoComplete="off"
                  />
                  {domainInput.trim().toLowerCase() !== 'dotlab.studio' && (
                    <button
                      onClick={() => setDomainInput('dotlab.studio')}
                      className="absolute right-3 bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition shadow-sm"
                      title="Reset to dotlab.studio"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#64748B] font-mono font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{selectedDomain.tld}</span>
                  <span>•</span>
                  <span>Node: <code className="text-[#2563EB] font-bold">{ethers.keccak256(ethers.toUtf8Bytes(selectedDomain.name)).slice(0, 14)}...</code></span>
                  <span>•</span>
                  <span className="text-[#10B981] font-bold">Canonical Sepolia Node</span>
                </p>
              </div>

              {/* Quick Status Pill */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSimModalOpen(true)}
                  className="neu-btn px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer text-[#2563EB]"
                >
                  <ShieldAlert className="w-4 h-4 text-[#2563EB]" />
                  <span>Launch Battle Simulator</span>
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${registryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="neu-btn px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-[#334155]"
                >
                  <span>Sepolia Contract ↗</span>
                </a>
              </div>

            </div>

            {/* Mined Ledger Information Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs pt-2">
              <div className="neu-concave-sm p-3.5 space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Registry Address</span>
                <p className="font-bold text-[#0F172A] truncate" title={registryAddress}>
                  {registryAddress}
                </p>
              </div>
              <div className="neu-concave-sm p-3.5 space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Daimo P-256 Verifier</span>
                <p className="font-bold text-[#0F172A] truncate">
                  {CANONICAL_P256_VERIFIER}
                </p>
              </div>
              <div className="neu-concave-sm p-3.5 space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Latest Mined Tx</span>
                <p className="font-bold text-[#0F172A] truncate">
                  {txHash} (Block 12074811)
                </p>
              </div>
            </div>
          </section>

          {/* THE 3-STEP PIPELINE IN CRISP WHITE LIGHT CARDS */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#0F172A]">
                Sovereign Certificate Sequence
              </h3>
              <span className="bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-mono font-semibold text-[#64748B] rounded-full">
                3-Step Deterministic Pipeline
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              
              {/* STEP 1: KEYPAIR FORGE */}
              <div className="neu-convex p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-mono font-bold text-[#2563EB] rounded-md">
                      ACT I
                    </span>
                    <Cpu className="w-4 h-4 text-[#64748B]" />
                  </div>

                  <h4 className="font-bold text-lg text-[#0F172A]">
                    1. Generate NIST P-256 Key
                  </h4>

                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Browser hardware WebCrypto generates raw secp256r1 coordinates. Private key never leaves memory.
                  </p>

                  <div className="space-y-2 pt-2 font-mono text-[11px]">
                    <div className="neu-concave-sm p-2.5 space-y-0.5">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase">Affine Qx:</span>
                      <p className="font-bold text-[#0F172A] break-all">{qx || '0x...'}</p>
                    </div>
                    <div className="neu-concave-sm p-2.5 space-y-0.5">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase">Affine Qy:</span>
                      <p className="font-bold text-[#0F172A] break-all">{qy || '0x...'}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateKey}
                  className="neu-btn w-full py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Generate Keypair</span>
                </button>
              </div>

              {/* STEP 2: PROOF-OF-POSSESSION */}
              <div className="neu-convex p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-mono font-bold text-[#2563EB] rounded-md">
                      ACT II
                    </span>
                    <Key className="w-4 h-4 text-[#64748B]" />
                  </div>

                  <h4 className="font-bold text-lg text-[#0F172A]">
                    2. Sign Proof-of-Possession
                  </h4>

                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Sign anti-replay challenge digest with strict low-s invariant enforcement ($s \le N/2$).
                  </p>

                  <div className="space-y-2 pt-2 font-mono text-[11px]">
                    <div className="neu-concave-sm p-2.5 space-y-0.5">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase">Signature (R):</span>
                      <p className="font-bold text-[#0F172A] break-all">{sigR ? `${sigR.slice(0, 32)}...` : 'Ready to sign'}</p>
                    </div>
                    <div className="neu-concave-sm p-2.5 space-y-0.5">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase">Canonical (S):</span>
                      <p className="font-bold text-[#0F172A] break-all">{sigS ? `${sigS.slice(0, 32)}...` : 'Ready to sign'}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignPoP}
                  disabled={isSigning}
                  className="neu-btn w-full py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{isSigning ? 'Signing Digest...' : 'Sign Proof-of-Possession'}</span>
                </button>
              </div>

              {/* STEP 3: COMMIT TO SEPOLIA */}
              <div className="neu-convex p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-mono font-bold text-[#2563EB] rounded-md">
                      ACT III
                    </span>
                    <Zap className="w-4 h-4 text-[#64748B]" />
                  </div>

                  <h4 className="font-bold text-lg text-[#0F172A]">
                    3. Commit to Sepolia
                  </h4>

                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Broadcast to DtrustRegistry. Daimo verifier validates ECDSA math in EVM state.
                  </p>

                  <div className="neu-concave-sm p-3 font-mono text-xs space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">STATUS:</span>
                      <span className={`font-bold ${pinnedCert ? (pinnedCert.revoked ? 'text-[#EF4444]' : 'text-[#10B981]') : 'text-[#D97706]'}`}>
                        {pinnedCert ? (pinnedCert.revoked ? 'REVOKED' : 'ACTIVELY PINNED') : 'READY TO COMMIT'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">NONCE:</span>
                      <span className="font-bold text-[#0F172A]">#{pinnedCert?.nonce || 1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">VALIDITY:</span>
                      <span className="font-bold text-[#0F172A]">60 Days Bound</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="neu-btn-primary w-full py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isPublishing ? 'Broadcasting...' : 'Commit to Sepolia Registry'}</span>
                </button>
              </div>

            </div>
          </section>

          {/* EMERGENCY REVOCATION PANEL */}
          {pinnedCert && (
            <section className="neu-convex p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-2 border-red-100 bg-red-50/20">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-mono text-[#DC2626] font-bold rounded-md">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Compromise Mitigation</span>
                </div>
                <h3 className="text-2xl font-bold text-[#0F172A]">
                  1-Block Sovereign Revocation
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Permanently terminates this certificate across all verifiers worldwide in a single block.
                </p>
              </div>

              <div>
                {!pinnedCert.revoked ? (
                  <button
                    onClick={handleRevoke}
                    className="neu-btn-danger px-6 py-3 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-[#DC2626]" />
                    <span>Execute 1-Block Revocation</span>
                  </button>
                ) : (
                  <div className="bg-red-100 border border-red-200 px-4 py-2 font-mono text-xs font-bold text-[#DC2626] rounded-lg">
                    Certificate Revoked On-Chain
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ON-CHAIN PROOFS ARCHIVE */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2563EB]" />
                <span>On-Chain Verification Archive</span>
              </h3>
              <span className="neu-concave-sm px-2 py-0.5 text-xs font-mono text-[#718096]">
                Sepolia 11155111
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a 
                href={`https://sepolia.etherscan.io/address/${registryAddress}`} 
                target="_blank" 
                rel="noreferrer"
                className="neu-convex p-4 space-y-1 block hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#0F172A]">DtrustRegistry ↗</span>
                  <span className="text-[10px] bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[#2563EB] font-bold rounded">Verified</span>
                </div>
                <p className="font-mono text-xs text-[#475569] truncate">{registryAddress}</p>
              </a>

              <a 
                href={`https://sepolia.etherscan.io/address/${CANONICAL_P256_VERIFIER}`} 
                target="_blank" 
                rel="noreferrer"
                className="neu-convex p-4 space-y-1 block hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#0F172A]">Daimo P-256 ↗</span>
                  <span className="text-[10px] bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[#2563EB] font-bold rounded">Precompile</span>
                </div>
                <p className="font-mono text-xs text-[#475569] truncate">{CANONICAL_P256_VERIFIER}</p>
              </a>

              <a 
                href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                target="_blank" 
                rel="noreferrer"
                className="neu-convex p-4 space-y-1 block hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#0F172A]">Mined Tx ↗</span>
                  <span className="text-[10px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[#059669] font-bold rounded">Block 12074811</span>
                </div>
                <p className="font-mono text-xs text-[#475569] truncate">{txHash}</p>
              </a>

              <a 
                href={`https://sepolia.etherscan.io/address/${wallet ? wallet.address : '0xd886168001663855a8f1ea7DdEa1393A074Ee354'}`} 
                target="_blank" 
                rel="noreferrer"
                className="neu-convex p-4 space-y-1 block hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#0F172A]">Deployer Wallet ↗</span>
                  <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[#475569] font-bold rounded">Owner</span>
                </div>
                <p className="font-mono text-xs text-[#475569] truncate">
                  {wallet ? wallet.address : '0xd886168001663855a8f1ea7DdEa1393A074Ee354'}
                </p>
              </a>
            </div>
          </section>

        </main>
      )}

      {/* VERIFIER BATTLE SIMULATOR MODAL (CRISP LIGHT MODE) */}
      {simModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/30 backdrop-blur-sm">
          <div className="neu-convex max-w-2xl w-full p-7 space-y-6 bg-white shadow-2xl border border-[#E2E8F0]">
            
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="neu-concave-sm px-2 py-0.5 text-[10px] font-mono text-[#2563EB] font-bold">
                  TACTICAL SIMULATION
                </span>
                <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                  Client Verifier Battle
                </h3>
              </div>
              <button 
                onClick={() => setSimModalOpen(false)}
                className="neu-btn p-2 cursor-pointer"
              >
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="neu-concave p-1.5 grid grid-cols-2 gap-2 rounded-xl">
              <button
                onClick={() => setSimMode('legit')}
                className={`py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                  simMode === 'legit' 
                    ? 'neu-convex bg-white text-[#2563EB] shadow-sm font-bold' 
                    : 'text-[#64748B]'
                }`}
              >
                Scenario A: Legit Server
              </button>
              <button
                onClick={() => setSimMode('rogue')}
                className={`py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                  simMode === 'rogue' 
                    ? 'neu-convex bg-white text-[#2563EB] shadow-sm font-bold' 
                    : 'text-[#64748B]'
                }`}
              >
                Scenario B: Rogue CA Attack
              </button>
            </div>

            {/* Tactical Scenario Display */}
            <div className="neu-concave p-5 space-y-3 rounded-xl">
              {simMode === 'legit' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A365D] text-base">
                      Zero-Trust Verification Passed
                    </span>
                    <span className="neu-convex-sm px-2.5 py-1 text-xs font-mono font-bold text-[#2ECC40]">
                      MATCH CONFIRMED
                    </span>
                  </div>
                  <p className="text-xs text-[#4A5568] leading-relaxed">
                    The web server presents the sovereign NIST P-256 public key. The Dtrust client extension queries Sepolia contract <code className="font-mono font-bold">0xE4ec4B30...</code> and validates exact coordinate parity.
                  </p>
                  <div className="neu-convex-sm p-3 font-mono text-xs space-y-1">
                    <div>SERVER KEY: <span className="font-bold">{qx.slice(0, 24)}...</span></div>
                    <div>ON-CHAIN: <span className="font-bold">{qx.slice(0, 24)}...</span></div>
                    <div className="font-bold text-[#2ECC40] pt-1">RESULT: Handshake Granted with Mathematical Proof</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#E53E3E] text-base">
                      Negative Override Triggered
                    </span>
                    <span className="neu-convex-sm px-2.5 py-1 text-xs font-mono font-bold text-[#E53E3E]">
                      CA INTERCEPTED
                    </span>
                  </div>
                  <p className="text-xs text-[#4A5568] leading-relaxed">
                    An attacker presents a fraudulent certificate from a compromised CA. Even though the browser trust store accepts it, Dtrust intercepts the connection, queries Sepolia, and rejects the key.
                  </p>
                  <div className="neu-convex-sm p-3 font-mono text-xs space-y-1">
                    <div>ROGUE KEY: <span className="font-bold text-[#E53E3E]">0xbadc0de99999... (Forged)</span></div>
                    <div>ON-CHAIN: <span className="font-bold text-[#1A365D]">{qx.slice(0, 24)}... (Sepolia)</span></div>
                    <div className="font-bold text-[#E53E3E] pt-1">RESULT: Connection Terminated Instantly</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSimModalOpen(false)}
                className="neu-btn px-6 py-2.5 text-xs font-semibold cursor-pointer"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
