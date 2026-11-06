// Dtrust Content Script - In-Page Sovereign TLS Trust Badge & Negative Override Enforcement (Light Mode)

(function() {
  const currentDomain = window.location.hostname.replace(/^www\./, '').toLowerCase();

  chrome.runtime.sendMessage({ type: "VERIFY_DOMAIN", domain: currentDomain }, (res) => {
    if (!res || res.status === "UNREGISTERED") return;

    // Check for simulated rogue CA attack in sessionStorage
    const isRogueSimulated = sessionStorage.getItem("dtrust_sim_rogue") === "true";

    if (isRogueSimulated) {
      renderNegativeOverrideBanner(res);
    } else {
      renderTrustBadge(res);
    }
  });

  function renderTrustBadge(data) {
    const badge = document.createElement("div");
    badge.id = "dtrust-trust-badge";
    badge.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #FFFFFF;
        color: #0F172A;
        border: 1px solid #10B981;
        padding: 8px 14px;
        border-radius: 9999px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.2), 0 2px 8px rgba(0,0,0,0.06);
        cursor: pointer;
        transition: all 0.2s ease;
      " onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span style="font-weight: 700; color: #0F172A;">Dtrust Verified</span>
        <span style="background: #ECFDF5; color: #047857; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-family: monospace; font-weight: 600; border: 1px solid #A7F3D0;">Sepolia</span>
      </div>
    `;

    badge.addEventListener("click", () => {
      alert(`🛡️ Dtrust Sovereign TLS Information\n\nDomain: ${data.domain}\nNetwork: ${data.network}\nPrecompile: ${data.precompile || data.verifier}\nStatus: Verified On-Chain\n\nThis domain is cryptographically anchored to Ethereum Sepolia. Centralized CAs cannot forge certificates for this domain.`);
    });

    document.body.appendChild(badge);
  }

  function renderNegativeOverrideBanner(data) {
    const banner = document.createElement("div");
    banner.id = "dtrust-negative-override";
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 10000000;
        background: rgba(248, 250, 252, 0.94);
        backdrop-filter: blur(12px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #0F172A;
        text-align: center;
      ">
        <div style="max-width: 580px; background: #FFFFFF; border: 2px solid #EF4444; border-radius: 24px; padding: 36px; box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.25);">
          <div style="width: 64px; height: 64px; border-radius: 16px; background: #FEF2F2; border: 1px solid #FECACA; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #DC2626; letter-spacing: -0.02em; margin-bottom: 12px;">
            NEGATIVE OVERRIDE: ROGUE CA BLOCKED
          </h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
            Dtrust detected that the TLS certificate presented by <strong style="color: #0F172A;">${data.domain}</strong> does NOT match the sovereign NIST P-256 key anchored on Ethereum Sepolia.
          </p>
          <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 14px; font-family: monospace; font-size: 11px; color: #991B1B; text-align: left; margin-bottom: 24px;">
            <div>Target Domain: <span style="font-weight: 700; color: #DC2626;">${data.domain}</span></div>
            <div>Enforcement: <span style="font-weight: 700; color: #DC2626;">Negative Override Active (Hard Block)</span></div>
            <div>Chain Verification: <span style="font-weight: 700; color: #2563EB;">Ethereum Sepolia (11155111)</span></div>
          </div>
          <button id="dtrust-bypass-btn" style="background: #F1F5F9; hover:background: #E2E8F0; color: #475569; font-size: 12px; font-weight: 600; padding: 10px 20px; border-radius: 10px; border: 1px solid #CBD5E1; cursor: pointer;">
            Bypass Warning (Unsafe)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    document.getElementById("dtrust-bypass-btn").addEventListener("click", () => {
      sessionStorage.removeItem("dtrust_sim_rogue");
      banner.remove();
    });
  }
})();
