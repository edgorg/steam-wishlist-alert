(function() {
  if (!window.location.href.includes("store.steampowered.com/wishlist")) return;
  if (window.__swaImporterLoaded) return;
  window.__swaImporterLoaded = true;

  function extractGames() {
    const games = [];
    const seenIds = new Set();

    for (const script of document.querySelectorAll("script")) {
      const text = script.textContent;
      if (!text.includes("appid")) continue;

      const matches = [...text.matchAll(/appid[\\"]*:\s*(\d+)/g)];
      for (const match of matches) {
        const appId = parseInt(match[1]);
        if (appId > 100000 && !seenIds.has(appId)) {
          seenIds.add(appId);
          games.push({ appId, name: `App ${appId}` });
        }
      }

      if (games.length > 0) break;
    }

    return games;
  }

  function showBanner(gameCount) {
    const existing = document.getElementById("swa-import-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "swa-import-banner";
    banner.innerHTML = `
      <div class="swa-banner-inner">
        <div class="swa-banner-header">
          <strong>Steam Wishlist Alerts</strong>
        </div>
        <p class="swa-banner-text">
          Found ${gameCount} game${gameCount === 1 ? "" : "s"} on your wishlist
        </p>
        <div class="swa-banner-actions">
          <button id="swa-import-btn" class="swa-banner-btn-primary">Import</button>
          <button id="swa-dismiss-btn" class="swa-banner-btn-secondary">Dismiss</button>
        </div>
      </div>
      <style>
        #swa-import-banner {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 99999;
          font-family: "Segoe UI", Arial, sans-serif;
          animation: swaSlideIn 0.3s ease;
        }
        @keyframes swaSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .swa-banner-inner {
          background: #1b2838;
          color: #c7d5e0;
          padding: 14px 18px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          border: 1px solid #2a475e;
          max-width: 300px;
        }
        .swa-banner-header {
          color: #66c0f4;
          font-size: 12px;
          margin-bottom: 10px;
        }
        .swa-banner-text {
          font-size: 12px;
          margin-bottom: 12px;
          color: #8f98a0;
        }
        .swa-banner-actions {
          display: flex;
          gap: 8px;
        }
        .swa-banner-btn-primary {
          background: #66c0f4;
          color: #1b2838;
          border: none;
          padding: 6px 14px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
        }
        .swa-banner-btn-primary:hover {
          background: #4db2e5;
        }
        .swa-banner-btn-secondary {
          background: none;
          color: #8f98a0;
          border: 1px solid #3a5a7e;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }
        .swa-banner-btn-secondary:hover {
          border-color: #66c0f4;
          color: #c7d5e0;
        }
        .swa-banner-success .swa-banner-inner {
          background: #1a3a1a;
          border-color: #2a5a2a;
        }
      </style>
    `;

    document.body.appendChild(banner);

    document.getElementById("swa-import-btn").addEventListener("click", () => {
      const games = extractGames();
      chrome.runtime.sendMessage({ type: "IMPORT_WISHLIST", games }, (response) => {
        if (response?.success) showSuccess(games.length);
      });
    });

    document.getElementById("swa-dismiss-btn").addEventListener("click", () => {
      banner.remove();
    });
  }

  function showSuccess(count) {
    const banner = document.getElementById("swa-import-banner");
    if (!banner) return;

    banner.classList.add("swa-banner-success");
    banner.querySelector(".swa-banner-inner").innerHTML = `
      <strong style="color: #6cc644; font-size: 12px;">Imported ${count} games!</strong>
      <p style="font-size: 11px; margin-top: 4px; color: #8f98a0;">Click the extension icon to set price targets</p>
    `;

    setTimeout(() => banner.remove(), 4000);
  }

  // Listen for requests from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "EXTRACT_GAMES") {
      sendResponse({ games: extractGames() });
    }
    return true;
  });

  // Auto-detect games after page loads
  function attemptDetection(retries = 2, delay = 1500) {
    const games = extractGames();
    if (games.length > 0) {
      showBanner(games.length);
    } else if (retries > 0) {
      setTimeout(() => attemptDetection(retries - 1, delay), delay);
    }
  }

  setTimeout(() => attemptDetection(), 500);
})();