(function() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SHOW_COMPARE") {
      showCompareModal(message.deals, message.name, message.appId, message.symbol);
      sendResponse({ success: true });
    }
  });

  function showCompareModal(deals, name, appId, symbol) {
    // Remove existing
    const existing = document.getElementById("swa-compare-overlay");
    if (existing) existing.remove();

    // Split into Steam and others
    const steamDeals = deals.filter(d => d.isSteam);
    const otherDeals = deals.filter(d => !d.isSteam).sort((a, b) => a.price - b.price);

    // Find cheapest
    const cheapest = Math.min(...deals.map(d => d.price));
    const cheapestCount = deals.filter(d => d.price === cheapest).length;
    const hasUniqueCheapest = cheapestCount === 1;

    // Build HTML
    let listHtml = "";

    if (steamDeals.length > 0) {
      listHtml += steamDeals.map(deal => renderItem(deal, cheapest, hasUniqueCheapest, symbol, appId)).join("");
      if (otherDeals.length > 0) {
        listHtml += '<div class="swa-separator"></div>';
        listHtml += '<div class="swa-group-label">Other Stores</div>';
      }
    }

    listHtml += otherDeals.map(deal => renderItem(deal, cheapest, hasUniqueCheapest, symbol, null)).join("");

    const overlay = document.createElement("div");
    overlay.id = "swa-compare-overlay";
    overlay.innerHTML = `
      <div class="swa-backdrop"></div>
      <div class="swa-modal">
        <div class="swa-header">
          <span class="swa-title">${name}</span>
          <button class="swa-close">x</button>
        </div>
        <div class="swa-list">
          ${listHtml}
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
        #swa-compare-overlay .swa-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
        }
        #swa-compare-overlay .swa-modal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #1b2838;
          border: 1px solid #2a475e;
          border-radius: 12px;
          padding: 20px;
          width: 450px;
          max-height: 500px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          animation: swaFadeIn 0.2s ease;
        }
        @keyframes swaFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        #swa-compare-overlay .swa-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #2a475e;
        }
        #swa-compare-overlay .swa-title {
          font-size: 16px;
          font-weight: 600;
          color: #c7d5e0;
        }
        #swa-compare-overlay .swa-close {
          background: none;
          border: none;
          color: #8f98a0;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }
        #swa-compare-overlay .swa-close:hover {
          color: #c7d5e0;
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
          transition: border-color 0.15s ease;
          text-decoration: none;
        }
        #swa-compare-overlay .swa-item:hover {
          border-color: #66c0f4;
        }
        #swa-compare-overlay .swa-item.cheapest {
          border-color: #6cc644;
          background: rgba(108, 198, 68, 0.05);
        }
        #swa-compare-overlay .swa-store-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        #swa-compare-overlay .swa-store-icon {
          width: 18px;
          height: 18px;
          border-radius: 3px;
        }
        #swa-compare-overlay .swa-store-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        #swa-compare-overlay .swa-store-name {
          font-size: 13px;
          color: #c7d5e0;
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
          font-size: 14px;
          font-weight: 600;
          color: #6cc644;
        }
        #swa-compare-overlay .swa-price.not-cheapest {
          color: #8f98a0;
          font-weight: 400;
        }
        #swa-compare-overlay .swa-discount {
          font-size: 10px;
          font-weight: 700;
          background: #4c6b22;
          color: #a4d007;
          padding: 2px 5px;
          border-radius: 3px;
        }
        #swa-compare-overlay .swa-separator {
          height: 1px;
          background: #66c0f4;
          opacity: 0.3;
          margin: 8px 0;
        }
        #swa-compare-overlay .swa-group-label {
          font-size: 10px;
          font-weight: 600;
          color: #56707f;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 0;
        }
      </style>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    overlay.querySelector(".swa-backdrop").addEventListener("click", () => overlay.remove());
    overlay.querySelector(".swa-close").addEventListener("click", () => overlay.remove());
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        overlay.remove();
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

  function renderItem(deal, cheapest, hasUniqueCheapest, symbol, steamAppId) {
    const isCheapest = hasUniqueCheapest && deal.price === cheapest;
    const url = deal.isSteam && steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : deal.dealUrl;
    const iconUrl = `https://www.isthereanydeal.com/images/shops/${deal.storeId}-1.svg`;

    let lowHtml = "";
    if (deal.storeLow !== null && deal.storeLow < deal.price) {
      lowHtml = `<span class="swa-store-low">Store low: ${symbol}${deal.storeLow.toFixed(2)}</span>`;
    } else if (deal.historyLow !== null && deal.historyLow < deal.price) {
      lowHtml = `<span class="swa-store-low">All-time low: ${symbol}${deal.historyLow.toFixed(2)}</span>`;
    }

    return `
      <div class="swa-item ${isCheapest ? 'cheapest' : ''}" data-url="${url}">
        <div class="swa-store-info">
          <img class="swa-store-icon" src="${iconUrl}" alt="" onerror="this.style.display='none'">
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