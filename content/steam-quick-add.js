(function() {
  // Only run on Steam app/game pages
  if (!window.location.href.match(/store\.steampowered\.com\/app\/\d+/)) return;

  // Prevent double injection
  if (window.__swaQuickAddLoaded) return;
  window.__swaQuickAddLoaded = true;

  // Extract app ID from URL
  const appIdMatch = window.location.href.match(/\/app\/(\d+)/);
  if (!appIdMatch) return;

  const appId = parseInt(appIdMatch[1]);

  // Wait for page to load
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector);
      if (existing) { resolve(existing); return; }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { observer.disconnect(); resolve(el); }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  }

  async function init() {
    // Find the purchase area on the page
    const purchaseArea = await waitForElement(".game_area_purchase_game, .game_purchase_action, .game_area_purchase");

    if (!purchaseArea) return;

    // Check if already tracked
    const data = await chrome.storage.local.get(["trackedGames"]);
    const tracked = (data.trackedGames || []).find(g => g.appId === appId);

    // Create the button
    const container = document.createElement("div");
    container.id = "swa-quick-add";
    container.innerHTML = `
      <button id="swa-track-btn" class="swa-track-btn ${tracked ? 'tracked' : ''}">
        ${tracked ? '✓ Tracking Price' : '🏷️ Track Price'}
      </button>
      <style>
        #swa-quick-add {
          margin: 10px 0;
        }
        .swa-track-btn {
          background: linear-gradient(135deg, #1b2838, #2a475e);
          color: #66c0f4;
          border: 1px solid #66c0f4;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          font-family: "Segoe UI", Arial, sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .swa-track-btn:hover {
          background: #66c0f4;
          color: #1b2838;
        }
        .swa-track-btn.tracked {
          background: rgba(108, 198, 68, 0.1);
          border-color: #6cc644;
          color: #6cc644;
          cursor: default;
        }
        .swa-track-btn.tracked:hover {
          background: rgba(108, 198, 68, 0.1);
          color: #6cc644;
        }
        .swa-track-btn.adding {
          opacity: 0.7;
          cursor: wait;
        }
      </style>
    `;

    // Insert before the purchase area
    purchaseArea.parentNode.insertBefore(container, purchaseArea);

    // Handle click
    if (!tracked) {
      const btn = document.getElementById("swa-track-btn");
      btn.addEventListener("click", async () => {
        btn.classList.add("adding");
        btn.textContent = "Adding...";

        // Get game name from page
        const nameEl = document.querySelector(".apphub_AppName, #appHubAppName");
        const name = nameEl?.textContent?.trim() || `App ${appId}`;

        // Send to background to add
        chrome.runtime.sendMessage({
          type: "QUICK_ADD_GAME",
          appId: appId,
          name: name
        }, (response) => {
          if (response?.success) {
            btn.classList.remove("adding");
            btn.classList.add("tracked");
            btn.textContent = "✓ Tracking Price";
          } else {
            btn.classList.remove("adding");
            btn.textContent = response?.error || "Could not add";
            setTimeout(() => {
              btn.textContent = "🏷️ Track Price";
            }, 2000);
          }
        });
      });
    }
  }

  init();
})();