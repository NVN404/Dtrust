// Dtrust Popup Script

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  const url = new URL(tab.url);
  const domain = url.hostname.replace(/^www\./, '').toLowerCase();

  const domainLabel = document.getElementById("domain-label");
  const detailsSection = document.getElementById("details-section");
  const keyLabel = document.getElementById("key-label");
  const etherscanLink = document.getElementById("etherscan-link");
  const simulateAttackBtn = document.getElementById("simulate-attack-btn");

  domainLabel.textContent = domain;

  chrome.runtime.sendMessage({ type: "VERIFY_DOMAIN", domain }, (res) => {
    if (res && res.status === "SECURE") {
      detailsSection.style.display = "block";
      keyLabel.textContent = `${res.qx.slice(0, 16)}... / ${res.qy.slice(0, 16)}...`;
      etherscanLink.href = res.etherscanUrl;
    } else {
      domainLabel.textContent = `${domain} (Unregistered)`;
      document.getElementById("status-indicator").style.background = "#64748b";
    }
  });

  simulateAttackBtn.addEventListener("click", async () => {
    // Inject rogue simulation flag into page session storage and reload
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        sessionStorage.setItem("dtrust_sim_rogue", "true");
        window.location.reload();
      }
    });
    window.close();
  });
});
