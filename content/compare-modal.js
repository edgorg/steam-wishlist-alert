(function() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SHOW_COMPARE") {
      showCompareModal(message.deals, message.name, message.appId, message.symbol);
      sendResponse({ success: true });
    }
  });

  const keyResellers = [
    { name: "Loaded", url: "https://www.loaded.com/?q=", icon: "https://cdn.loaded.com/media/favicon/default/loaded_fav.png" },
    { name: "G2A", url: "https://www.g2a.com/search?query=", icon: "https://www.g2a.com/favicon.ico" },
    { name: "Kinguin", url: "https://www.kinguin.net/catalogsearch/result/?q=", icon: "https://www.kinguin.net/favicon.ico" },
    { name: "Eneba", url: "https://www.eneba.com/store?text=", icon: "https://www.eneba.com/favicon.ico" },
    { name: "Instant Gaming", url: "https://www.instant-gaming.com/en/search/?q=", icon: "https://www.instant-gaming.com/favicon.ico" },
    { name: "AllKeyShop", url: "https://www.allkeyshop.com/blog/catalogue/search-", icon: "https://www.allkeyshop.com/favicon.ico" }
  ];

  function showCompareModal(deals, name, appId, symbol) {
    const existing = document.getElementById("swa-compare-overlay");
    if (existing) existing.remove();

    // Get section order from storage
    chrome.storage.local.get(["compareSectionOrder"], (data) => {
      const sectionOrder = data.compareSectionOrder || ["steam", "otherStores", "keyResellers"];
      renderModal(deals, name, appId, symbol, sectionOrder);
    });
  }

  function renderModal(deals, name, appId, symbol, sectionOrder) {
    // Split into Steam and others
    const steamDeals = deals.filter(d => d.isSteam);
    const otherDeals = deals.filter(d => !d.isSteam).sort((a, b) => a.price - b.price);

    // Find cheapest
    const allDeals = [...steamDeals, ...otherDeals];
    const cheapest = Math.min(...allDeals.map(d => d.price));
    const cheapestCount = allDeals.filter(d => d.price === cheapest).length;
    const hasUniqueCheapest = cheapestCount === 1;

    // Build each section
    const sections = {
      steam: buildSteamSection(steamDeals, cheapest, hasUniqueCheapest, symbol, appId),
      otherStores: buildOtherStoresSection(otherDeals, cheapest, hasUniqueCheapest, symbol),
      keyResellers: buildKeyResellersSection(name)
    };

    // Combine in saved order
    let listHtml = "";
    for (const sectionId of sectionOrder) {
      listHtml += sections[sectionId] || "";
    }

    const bannerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

    const overlay = document.createElement("div");
    overlay.id = "swa-compare-overlay";
    overlay.innerHTML = `
      <div class="swa-backdrop"></div>
      <div class="swa-modal">
        <img class="swa-banner" src="${bannerUrl}" alt="${name}" onerror="this.style.display='none'">
        <div class="swa-content">
          <div class="swa-header">
            <span class="swa-title">${name}</span>
            <button class="swa-close">\u2715</button>
          </div>
          <div class="swa-list">
            ${listHtml}
          </div>
          <div class="swa-credit">
            Data from <a class="swa-credit-link" href="https://isthereanydeal.com/steam/app/${appId}/" target="_blank">IsThereAnyDeal.com</a>
          </div>
        </div>
      </div>
      <style>
        #swa-compare-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2147483647;
          font-family: "Segoe UI", Arial, sans-serif;
        }
        #swa-compare-overlay * {
          box-sizing: border-box;
        }
        #swa-compare-overlay .swa-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
        }
        #swa-compare-overlay .swa-modal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #1b2838;
          border: 1px solid #2a475e;
          border-radius: 12px;
          width: 480px;
          max-height: 620px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
          animation: swaFadeIn 0.2s ease;
          overflow: hidden;
        }
        @keyframes swaFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        #swa-compare-overlay .swa-banner {
          width: 100%;
          height: 120px;
          object-fit: cover;
          display: block;
        }
        #swa-compare-overlay .swa-content {
          padding: 16px 20px 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }
        #swa-compare-overlay .swa-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid #2a475e;
        }
        #swa-compare-overlay .swa-title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }
        #swa-compare-overlay .swa-close {
          background: none;
          border: none;
          color: #8f98a0;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          line-height: 1;
        }
        #swa-compare-overlay .swa-close:hover {
          color: #ffffff;
          background: #2a475e;
        }
        #swa-compare-overlay .swa-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          flex: 1;
        }
        #swa-compare-overlay .swa-list::-webkit-scrollbar {
          width: 4px;
        }
        #swa-compare-overlay .swa-list::-webkit-scrollbar-track {
          background: transparent;
        }
        #swa-compare-overlay .swa-list::-webkit-scrollbar-thumb {
          background: #2a475e;
          border-radius: 2px;
        }
        #swa-compare-overlay .swa-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #213345;
          border: 1px solid #2a475e;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        #swa-compare-overlay .swa-item:hover {
          border-color: #66c0f4;
          background: #2a475e;
        }
        #swa-compare-overlay .swa-item.cheapest {
          border-color: #6cc644;
          background: rgba(108, 198, 68, 0.08);
        }
        #swa-compare-overlay .swa-store-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        #swa-compare-overlay .swa-store-icon {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: #2a475e;
          padding: 2px;
        }
        #swa-compare-overlay .swa-store-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        #swa-compare-overlay .swa-store-name {
          font-size: 13px;
          color: #c7d5e0;
          font-weight: 500;
        }
        #swa-compare-overlay .swa-store-low {
          font-size: 10px;
          color: #56707f;
        }
        #swa-compare-overlay .swa-badge {
          font-size: 9px;
          font-weight: 600;
          color: #6cc644;
          background: rgba(108, 198, 68, 0.15);
          padding: 2px 6px;
          border-radius: 3px;
          margin-left: 8px;
        }
        #swa-compare-overlay .swa-price-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        #swa-compare-overlay .swa-price {
          font-size: 15px;
          font-weight: 600;
          color: #6cc644;
        }
        #swa-compare-overlay .swa-price.not-cheapest {
          color: #8f98a0;
          font-weight: 400;
          font-size: 14px;
        }
        #swa-compare-overlay .swa-discount {
          font-size: 10px;
          font-weight: 700;
          background: #4c6b22;
          color: #a4d007;
          padding: 2px 5px;
          border-radius: 3px;
        }
        #swa-compare-overlay .swa-group-label {
          font-size: 10px;
          font-weight: 600;
          color: #66c0f4;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 0 2px;
        }
        #swa-compare-overlay .swa-credit {
          text-align: center;
          padding-top: 10px;
          margin-top: 10px;
          border-top: 1px solid #2a475e;
          font-size: 10px;
          color: #56707f;
        }
        #swa-compare-overlay .swa-credit-link {
          color: #66c0f4;
          text-decoration: none;
        }
        #swa-compare-overlay .swa-credit-link:hover {
          text-decoration: underline;
        }
        #swa-compare-overlay .swa-resellers-section {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #2a475e;
        }
        #swa-compare-overlay .swa-resellers-note {
          font-size: 9px;
          color: #56707f;
          font-style: italic;
          margin-bottom: 8px;
        }
        #swa-compare-overlay .swa-reseller-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        #swa-compare-overlay .swa-reseller-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: #213345;
          border: 1px solid #2a475e;
          border-radius: 6px;
          color: #c7d5e0;
          text-decoration: none;
          font-size: 11px;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        #swa-compare-overlay .swa-reseller-link:hover {
          border-color: #66c0f4;
          background: #2a475e;
        }
        #swa-compare-overlay .swa-reseller-icon {
          width: 14px;
          height: 14px;
          border-radius: 2px;
        }
      </style>
    `;

    document.body.appendChild(overlay);

    // Freeze background scrolling
    document.body.style.overflow = "hidden";

    // Close handlers
    overlay.querySelector(".swa-backdrop").addEventListener("click", () => {
      overlay.remove();
      document.body.style.overflow = "";
    });
    overlay.querySelector(".swa-close").addEventListener("click", () => {
      overlay.remove();
      document.body.style.overflow = "";
    });
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        overlay.remove();
        document.body.style.overflow = "";
        document.removeEventListener("keydown", escHandler);
      }
    });

    // Item click handlers
    overlay.querySelectorAll(".swa-item").forEach(item => {
      item.addEventListener("click", () => {
        const url = item.dataset.url;
        if (url) window.open(url, "_blank");
      });
    });
  }

  function buildSteamSection(steamDeals, cheapest, hasUniqueCheapest, symbol, appId) {
    if (steamDeals.length === 0) return "";
    let html = '<div class="swa-group-label">Steam</div>';
    html += steamDeals.map(deal => renderItem(deal, cheapest, hasUniqueCheapest, symbol, appId)).join("");
    return html;
  }

  function buildOtherStoresSection(otherDeals, cheapest, hasUniqueCheapest, symbol) {
    if (otherDeals.length === 0) return "";
    let html = '<div class="swa-group-label">Other Stores</div>';
    html += otherDeals.map(deal => renderItem(deal, cheapest, hasUniqueCheapest, symbol, null)).join("");
    return html;
  }

  function buildKeyResellersSection(name) {
    const encoded = encodeURIComponent(name);
    let html = '<div class="swa-resellers-section">';
    html += '<div class="swa-group-label">Key Resellers</div>';
    html += '<div class="swa-resellers-note">Third-party marketplaces — buy at your own discretion</div>';
    html += '<div class="swa-reseller-list">';
    for (const reseller of keyResellers) {
      html += `
        <a class="swa-reseller-link" href="${reseller.url}${encoded}" target="_blank">
          <img class="swa-reseller-icon" src="${reseller.icon}" alt="" onerror="this.style.display='none'">
          ${reseller.name}
        </a>
      `;
    }
    html += '</div></div>';
    return html;
  }

  function renderItem(deal, cheapest, hasUniqueCheapest, symbol, steamAppId) {
    const isCheapest = hasUniqueCheapest && deal.price === cheapest;
    const url = deal.isSteam && steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : deal.dealUrl;

    const storeFavicons = {
      "steam": "https://store.steampowered.com/favicon.ico",
      "gog": "https://www.gog.com/favicon.ico",
      "humble store": "https://cdn.humblebundle.com/static/hashed/4c8bbc6fc7b2b8a9fa21e895afe1157188e28bfb.png",
      "humble bundle": "https://cdn.humblebundle.com/static/hashed/4c8bbc6fc7b2b8a9fa21e895afe1157188e28bfb.png",
      "humble choice": "https://cdn.humblebundle.com/static/hashed/4c8bbc6fc7b2b8a9fa21e895afe1157188e28bfb.png",
      "epic games store": "https://static-assets-prod.epicgames.com/epic-store/static/favicon.ico",
      "epic game store": "https://static-assets-prod.epicgames.com/epic-store/static/favicon.ico",
      "green man gaming": "https://www.greenmangaming.com/favicon.ico",
      "greenmangaming": "https://www.greenmangaming.com/favicon.ico",
      "fanatical": "https://www.fanatical.com/favicon.ico",
      "gamesplanet": "https://uk.gamesplanet.com/favicon.ico",
      "gamesplanet uk": "https://uk.gamesplanet.com/favicon.ico",
      "gamesplanet us": "https://us.gamesplanet.com/favicon.ico",
      "voidu": "https://www.voidu.com/favicon.ico",
      "gamebillet": "https://www.gamebillet.com/favicon.ico",
      "dlgamer": "https://www.dlgamer.com/favicon.ico",
      "2game": "https://2game.com/favicon.ico",
      "noctre": "https://www.noctre.com/favicon.ico",
      "dreamgame": "https://www.dreamgame.com/favicon.ico",
      "indiegala": "https://www.indiegala.com/favicon.ico",
      "wingamestore": "https://www.wingamestore.com/favicon.ico",
      "allyouplay": "https://www.allyouplay.com/favicon.ico",
      "direct2drive": "https://www.direct2drive.com/favicon.ico",
      "microsoft store": "https://apps.microsoft.com/favicon.ico",
      "xbox": "https://www.xbox.com/favicon.ico",
      "xbox store": "https://www.xbox.com/favicon.ico",
      "ubisoft store": "https://store.ubisoft.com/favicon.ico",
      "ubisoft": "https://store.ubisoft.com/favicon.ico",
      "ea app": "https://www.ea.com/favicon.ico",
      "origin": "https://www.ea.com/favicon.ico",
      "battlenet": "https://www.blizzard.com/favicon.ico",
      "battle.net": "https://www.blizzard.com/favicon.ico",
      "blizzard": "https://www.blizzard.com/favicon.ico",
      "nuuvem": "https://www.nuuvem.com/favicon.ico",
      "gamersgate": "https://www.gamersgate.com/favicon.ico",
      "amazon": "https://www.amazon.com/favicon.ico",
      "itch.io": "https://itch.io/favicon.ico",
      "squenix": "https://store.square-enix-games.com/favicon.ico",
      "square enix": "https://store.square-enix-games.com/favicon.ico"
    };

    const iconUrl = storeFavicons[deal.store.toLowerCase()] || "";

    let lowHtml = "";
    if (deal.storeLow !== null && deal.storeLow < deal.price) {
      lowHtml = `<span class="swa-store-low">Store low: ${symbol}${deal.storeLow.toFixed(2)}</span>`;
    } else if (deal.historyLow !== null && deal.historyLow < deal.price) {
      lowHtml = `<span class="swa-store-low">All-time low: ${symbol}${deal.historyLow.toFixed(2)}</span>`;
    }

    return `
      <div class="swa-item ${isCheapest ? 'cheapest' : ''}" data-url="${url}">
        <div class="swa-store-info">
          ${iconUrl ? `<img class="swa-store-icon" src="${iconUrl}" alt="" onerror="this.style.display='none'">` : ''}
          <div class="swa-store-details">
            <span class="swa-store-name">${deal.store}</span>
            ${lowHtml}
          </div>
          ${isCheapest ? '<span class="swa-badge">Best price</span>' : ''}
        </div>
        <div class="swa-price-details">
          <span class="swa-price ${hasUniqueCheapest && !isCheapest ? 'not-cheapest' : ''}">${symbol}${deal.price.toFixed(2)}</span>
          ${deal.discount > 0 ? `<span class="swa-discount">-${deal.discount}%</span>` : ''}
        </div>
      </div>
    `;
  }
})();