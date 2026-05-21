(function() {
  if (!window.location.href.includes("store.steampowered.com/wishlist")) return;

  if (window.__swaImporterLoaded) return;
  window.__swaImporterLoaded = true;

  console.log("[SWA] Wishlist importer loaded");

    function extractGames() {
    const games = [];
    const seenIds = new Set();

    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      const text = script.textContent;

      // Only look at scripts that contain appid data
      if (!text.includes("appid")) continue;

      // Use the regex that we know works
      const appIdMatches = [...text.matchAll(/appid[\\"]*:\s*(\d+)/g)];

      for (const match of appIdMatches) {
        const appId = parseInt(match[1]);
        // Filter: must be a real game ID (above 100000) and unique
        if (appId && appId > 100000 && !seenIds.has(appId)) {
          seenIds.add(appId);
          games.push({ appId, name: `App ${appId}` });
        }
      }

      if (games.length > 0) {
        console.log(`[SWA] Found ${games.length} games`);
        break;
      }
    }

    return games;
  }

  function showBanner(gameCount) {
    const existing = document.getElementById("swa-import-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "swa-import-banner";
    banner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1b2838;
        color: #c7d5e0;
        padding: 14px 18px;
        border-radius: 10px;
        z-index: 99999;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        border: 1px solid #2a475e;
        max-width: 300px;
        animation: swaSlideIn 0.3s ease;
      ">
        <style>
          @keyframes swaSlideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
          <strong style="color: #66c0f4; font-size: 12px;">Steam Wishlist Alerts</strong>
        </div>
        <p style="font-size: 12px; margin-bottom: 12px; color: #8f98a0;">
          Found ${gameCount} game${gameCount === 1 ? "" : "s"} on your wishlist
        </p>
        <div style="display: flex; gap: 8px;">
          <button id="swa-import-btn" style="
            background: #66c0f4;
            color: #1b2838;
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
          ">Import</button>
          <button id="swa-dismiss-btn" style="
            background: none;
            color: #8f98a0;
            border: 1px solid #3a5a7e;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
          ">Dismiss</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById("swa-import-btn").addEventListener("click", () => {
      const games = extractGames();
      chrome.runtime.sendMessage({ type: "IMPORT_WISHLIST", games }, (response) => {
        if (response?.success) {
          showSuccess(games.length);
        }
      });
    });

    document.getElementById("swa-dismiss-btn").addEventListener("click", () => {
      banner.remove();
    });
  }

  function showSuccess(count) {
    const banner = document.getElementById("swa-import-banner");
    if (banner) {
      banner.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #1a3a1a;
          color: #c7d5e0;
          padding: 14px 18px;
          border-radius: 10px;
          z-index: 99999;
          font-family: Arial, sans-serif;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          border: 1px solid #2a5a2a;
          max-width: 300px;
        ">
          <strong style="color: #6cc644; font-size: 12px;">Imported ${count} games!</strong>
          <p style="font-size: 11px; margin-top: 4px; color: #8f98a0;">Click the extension icon to set price targets</p>
        </div>
      `;

      setTimeout(() => {
        banner.remove();
      }, 4000);
    }
  }
  
  function showSuccess(count) {
    const banner = document.getElementById("swa-import-banner");
    if (banner) {
      banner.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #1a3a1a;
          color: #c7d5e0;
          padding: 14px 18px;
          border-radius: 10px;
          z-index: 99999;
          font-family: Arial, sans-serif;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          border: 1px solid #2a5a2a;
          max-width: 300px;
        ">
          <strong style="color: #6cc644; font-size: 12px;">Imported ${count} games!</strong>
          <p style="font-size: 11px; margin-top: 4px; color: #8f98a0;">Click the extension icon to set price targets</p>
        </div>
      `;

      setTimeout(() => {
        banner.remove();
      }, 4000);
    }
  }

    // Listen for requests from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "EXTRACT_GAMES") {
      const games = extractGames();
      sendResponse({ games });
    }
    return true;
  });

  // Start after a short delay to let the page render and scripts load
  setTimeout(() => {
    const games = extractGames();
    if (games.length > 0) {
      showBanner(games.length);
    } else {
      console.log("[SWA] No games found, retrying...");
      setTimeout(() => {
        const retryGames = extractGames();
        if (retryGames.length > 0) {
          showBanner(retryGames.length);
        } else {
          console.log("[SWA] Still no games found");
        }
      }, 2000);
    }
  }, 500);
})();