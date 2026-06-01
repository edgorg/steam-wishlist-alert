// ============================================================
// DOM Elements
// ============================================================
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const importSection = document.getElementById("import-section");
const importPageBtn = document.getElementById("import-page-btn");
const dealsSection = document.getElementById("deals-section");
const dealsList = document.getElementById("deals-list");
const dealsCount = document.getElementById("deals-count");
const gamesList = document.getElementById("games-list");
const watchingCount = document.getElementById("watching-count");
const emptyState = document.getElementById("empty-state");
const importHint = document.getElementById("import-hint");
const checkNowBtn = document.getElementById("check-now-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const clearBtn = document.getElementById("clear-btn");
const lastCheckedEl = document.getElementById("last-checked");
const themeToggle = document.getElementById("theme-toggle");
const notificationsToggle = document.getElementById("notifications-toggle");
const modalOverlay = document.getElementById("modal-overlay");
const modalMessage = document.getElementById("modal-message");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");
const regionSelect = document.getElementById("region-select");
const searchSpinner = document.getElementById("search-spinner");
const compareCache = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const upgradeBtn = document.getElementById("upgrade-btn");
const premiumInactive = document.getElementById("premium-inactive");
const premiumActive = document.getElementById("premium-active");
const premiumInput = document.getElementById("premium-input");
const licenceInput = document.getElementById("licence-input");
const licenceSubmit = document.getElementById("licence-submit");
const licenceError = document.getElementById("licence-error");
const sortSelect = document.getElementById("sort-select");
const saleBanner = document.getElementById("sale-banner");
const saleText = document.getElementById("sale-text");

let searchTimeout = null;
let currentCurrencySymbol = "\u00A3";
let isPremium = false;
let inputFocused = false;
let currentSort = "name";

const REGION_CURRENCY = {
  gb: { code: "GBP", symbol: "\u00A3" },
  us: { code: "USD", symbol: "$" },
  eu: { code: "EUR", symbol: "\u20AC" },
  au: { code: "AUD", symbol: "A$" },
  ca: { code: "CAD", symbol: "C$" },
  nz: { code: "NZD", symbol: "NZ$" },
  jp: { code: "JPY", symbol: "\u00A5" },
  br: { code: "BRL", symbol: "R$" },
  in: { code: "INR", symbol: "\u20B9" },
  cn: { code: "CNY", symbol: "\u00A5" },
  kr: { code: "KRW", symbol: "\u20A9" },
  tw: { code: "TWD", symbol: "NT$" },
  hk: { code: "HKD", symbol: "HK$" },
  sg: { code: "SGD", symbol: "S$" },
  th: { code: "THB", symbol: "\u0E3F" },
  my: { code: "MYR", symbol: "RM" },
  ph: { code: "PHP", symbol: "\u20B1" },
  id: { code: "IDR", symbol: "Rp" },
  vn: { code: "VND", symbol: "\u20AB" },
  za: { code: "ZAR", symbol: "R" },
  mx: { code: "MXN", symbol: "MX$" },
  ar: { code: "ARS", symbol: "ARS$" },
  cl: { code: "CLP", symbol: "CLP$" },
  co: { code: "COP", symbol: "COP$" },
  tr: { code: "TRY", symbol: "\u20BA" },
  ua: { code: "UAH", symbol: "\u20B4" },
  pl: { code: "PLN", symbol: "z\u0142" },
  no: { code: "NOK", symbol: "kr" },
  se: { code: "SEK", symbol: "kr" },
  dk: { code: "DKK", symbol: "kr" },
  ch: { code: "CHF", symbol: "CHF" },
  ae: { code: "AED", symbol: "AED" },
  sa: { code: "SAR", symbol: "SAR" },
  kw: { code: "KWD", symbol: "KWD" },
  qa: { code: "QAR", symbol: "QAR" },
  pe: { code: "PEN", symbol: "S/" },
  uy: { code: "UYU", symbol: "$U" },
  cr: { code: "CRC", symbol: "\u20A1" },
  kz: { code: "KZT", symbol: "\u20B8" },
  pk: { code: "PKR", symbol: "Rs" }
};

// ============================================================
// Initialise
// ============================================================
async function init() {
  await loadSettings();

  const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  const games = data.trackedGames || [];
  const targets = data.priceTargets || {};

  if (games.length === 0) {
    emptyState.classList.remove("hidden");
    importHint.classList.add("hidden");
    watchingCount.textContent = "0";
    dealsCount.textContent = "";
    dealsSection.classList.add("hidden");
    dealsList.innerHTML = "";
    gamesList.innerHTML = "";
  } else {
    emptyState.classList.add("hidden");
    importHint.classList.remove("hidden");
    detectCurrency(games);
    renderGames(games, targets);
  }

  updateLastChecked();
  checkForWishlistPage();
  checkSaleCountdown();
}

// ============================================================
// Custom Modal
// ============================================================
function showModal(message, confirmText = "Continue", isDanger = false) {
  return new Promise((resolve) => {
    modalMessage.textContent = message;
    modalConfirm.textContent = confirmText;
    modalConfirm.className = `modal-btn ${isDanger ? 'modal-btn-danger' : 'modal-btn-confirm'}`;
    modalOverlay.classList.remove("hidden");

    function handleConfirm() {
      cleanup();
      resolve(true);
    }

    function handleCancel() {
      cleanup();
      resolve(false);
    }

    function cleanup() {
      modalOverlay.classList.add("hidden");
      modalConfirm.removeEventListener("click", handleConfirm);
      modalCancel.removeEventListener("click", handleCancel);
    }

    modalConfirm.addEventListener("click", handleConfirm);
    modalCancel.addEventListener("click", handleCancel);
  });
}

// ============================================================
// Currency Detection
// ============================================================
function detectCurrency(games) {
  if (games.length > 0 && games[0].currency) {
    const code = games[0].currency;

    // Find symbol from REGION_CURRENCY map
    const match = Object.values(REGION_CURRENCY).find(r => r.code === code);
    if (match) {
      currentCurrencySymbol = match.symbol;
    } else {
      currentCurrencySymbol = code;
    }
  }
}

// ============================================================
// Settings
// ============================================================
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!settingsPanel.classList.contains("hidden") &&
      !settingsPanel.contains(e.target) &&
      e.target !== settingsBtn &&
      !settingsBtn.contains(e.target)) {
    settingsPanel.classList.add("hidden");
  }
});

sortSelect.addEventListener("change", async (e) => {
  currentSort = e.target.value;
  await chrome.storage.local.set({ sortPreference: currentSort });

  const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  renderGames(data.trackedGames || [], data.priceTargets || {});
});

themeToggle.querySelectorAll(".setting-toggle").forEach(btn => {
  btn.addEventListener("click", async () => {
    themeToggle.querySelectorAll(".setting-toggle").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const theme = btn.dataset.value;
    await chrome.storage.local.set({ theme });
    applyTheme(theme);
  });
});

notificationsToggle.querySelectorAll(".setting-toggle").forEach(btn => {
  btn.addEventListener("click", async () => {
    notificationsToggle.querySelectorAll(".setting-toggle").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    await chrome.storage.local.set({ notifications: btn.dataset.value });
  });
});

function applyTheme(theme) {
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

async function loadSettings() {
  const data = await chrome.storage.local.get(["theme", "notifications", "region", "sortPreference"]);

  const theme = data.theme || "dark";
  applyTheme(theme);
  themeToggle.querySelectorAll(".setting-toggle").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === theme);
  });

  const notifications = data.notifications || "on";
  notificationsToggle.querySelectorAll(".setting-toggle").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === notifications);
  });

  const region = data.region || "gb";
  regionSelect.value = region;

  // Check premium status
  isPremium = await LicenceService.checkPremiumStatus();
  if (isPremium) {
    showPremiumActive();
  } else {
    showPremiumInactive();
  }

  const sortPref = data.sortPreference || "name";
  currentSort = sortPref;
  sortSelect.value = sortPref;
}

// ============================================================
// Last Checked Timestamp
// ============================================================
async function updateLastChecked() {
  const data = await chrome.storage.local.get(["lastChecked"]);
  if (data.lastChecked) {
    const diff = Date.now() - data.lastChecked;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) {
      lastCheckedEl.textContent = "Prices checked just now";
    } else if (minutes < 60) {
      lastCheckedEl.textContent = `Prices checked ${minutes} min${minutes === 1 ? "" : "s"} ago`;
    } else if (hours < 24) {
      lastCheckedEl.textContent = `Prices checked ${hours} hour${hours === 1 ? "" : "s"} ago`;
    } else {
      lastCheckedEl.textContent = `Prices checked ${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? "" : "s"} ago`;
    }
  } else {
    lastCheckedEl.textContent = "Prices not yet checked";
  }
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// ============================================================
// Search
// ============================================================
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();

  clearTimeout(searchTimeout);

  if (query.length < 2) {
    searchResults.classList.add("hidden");
    searchSpinner.classList.add("hidden");
    return;
  }

  searchSpinner.classList.remove("hidden");

  searchTimeout = setTimeout(async () => {
    const results = await SteamAPI.searchGame(query);
    searchSpinner.classList.add("hidden");
    renderSearchResults(results);
  }, 400);
});

async function renderSearchResults(results) {
  if (results.length === 0) {
    searchResults.classList.remove("hidden");
    searchResults.innerHTML = '<div class="search-no-results">No games found</div>';
    return;
  }

  const data = await chrome.storage.local.get(["trackedGames"]);
  const tracked = (data.trackedGames || []).map(g => g.appId);

  searchResults.classList.remove("hidden");
  searchResults.innerHTML = results.slice(0, 5).map(game => {
    const isTracked = tracked.includes(game.appId);
    return `
      <div class="search-result ${isTracked ? 'already-tracked' : ''}" data-appid="${game.appId}" data-name="${game.name}">
        <img class="search-result-image" src="${game.capsuleUrl}" alt="${game.name}" loading="lazy">
        <span class="search-result-name">${game.name}</span>
        <span class="search-result-add">${isTracked ? 'Tracked' : '+ Add'}</span>
      </div>
    `;
  }).join("");

  searchResults.querySelectorAll(".search-result:not(.already-tracked)").forEach(el => {
    el.addEventListener("click", async () => {
      const appId = parseInt(el.dataset.appid);
      const name = el.dataset.name;

      el.querySelector(".search-result-add").textContent = "Adding...";
      el.style.pointerEvents = "none";

      await addGame(appId, name);
      searchInput.value = "";
      searchResults.classList.add("hidden");
    });
  });
}

// ============================================================
// Steam Sale Countdown
// ============================================================
function checkSaleCountdown() {
  const now = new Date();
  const year = now.getFullYear();

  // Estimated dates based on historical patterns
  // Update these annually when Valve announces dates 
  // https://partner.steamgames.com/doc/marketing/upcoming_events
  const sales = [
    { name: "Spring Sale", start: new Date(year, 2, 13), end: new Date(year, 2, 20) },
    { name: "Summer Sale", start: new Date(year, 5, 26), end: new Date(year, 6, 10) },
    { name: "Autumn Sale", start: new Date(year, 10, 21), end: new Date(year, 10, 28) },
    { name: "Winter Sale", start: new Date(year, 11, 19), end: new Date(year + 1, 0, 2) },
  ];

  const nextYearSales = [
    { name: "Spring Sale", start: new Date(year + 1, 2, 13), end: new Date(year + 1, 2, 20) },
  ];

  const allSales = [...sales, ...nextYearSales];

  // Check if a sale is live right now
  for (const sale of allSales) {
    if (now >= sale.start && now <= sale.end) {
      saleBanner.classList.remove("hidden");
      saleBanner.classList.add("sale-live");
      saleText.innerHTML = `<strong>Steam ${sale.name}</strong> is live! Ends ${formatSaleDate(sale.end)}`;
      return;
    }
  }

  // Find next upcoming sale
  let nextSale = null;
  for (const sale of allSales) {
    if (sale.start > now) {
      nextSale = sale;
      break;
    }
  }

  if (nextSale) {
    const daysUntil = Math.ceil((nextSale.start - now) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 30) {
      saleBanner.classList.remove("hidden");
      saleBanner.classList.remove("sale-live");

      if (daysUntil <= 1) {
        saleText.innerHTML = `<strong>Steam ${nextSale.name}</strong> expected tomorrow`;
      } else if (daysUntil <= 7) {
        saleText.innerHTML = `<strong>Steam ${nextSale.name}</strong> expected in ${daysUntil} days`;
      } else {
        saleText.innerHTML = `<strong>Steam ${nextSale.name}</strong> expected ~${formatSaleDate(nextSale.start)}`;
      }
    } else {
      saleBanner.classList.add("hidden");
    }
  } else {
    saleBanner.classList.add("hidden");
  }
}

function formatSaleDate(date) {
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

// Premium - Upgrade button
upgradeBtn.addEventListener("click", () => {
  if (!premiumInput.classList.contains("visible")) {
    premiumInput.classList.remove("hidden");
    premiumInput.classList.add("visible");

    const errorEl = document.getElementById("licence-error");
    errorEl.innerHTML = `<a href="#" id="buy-link" class="buy-premium-link">Don't have a key? Buy Premium here</a>`;

    document.getElementById("buy-link").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: LicenceService.getCheckoutUrl() });
    });
  } else {
    premiumInput.classList.remove("visible");
  }
});

// Premium - Activate licence
licenceSubmit.addEventListener("click", async () => {
  const key = licenceInput.value.trim();

  if (!key) {
    showLicenceError("Please enter a licence key");
    return;
  }

  licenceSubmit.textContent = "Checking...";
  licenceSubmit.disabled = true;

  const result = await LicenceService.activateKey(key);

  if (result.success) {
    await LicenceService.saveLicence(key);
    isPremium = true;
    showPremiumActive();

    const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
    if (data.trackedGames && data.trackedGames.length > 0) {
      renderGames(data.trackedGames, data.priceTargets || {});
    }
  } else {
    showLicenceError(result.error || "Invalid licence key");
  }

  licenceSubmit.textContent = "Activate";
  licenceSubmit.disabled = false;
});

function showLicenceError(message) {
  const errorEl = document.getElementById("licence-error");
  errorEl.textContent = message;
  errorEl.classList.add("error-visible");

  setTimeout(() => {
    errorEl.classList.remove("error-visible");
    // Restore the buy link
    errorEl.innerHTML = `<a href="#" id="buy-link" class="buy-premium-link">Don't have a key? Buy Premium here</a>`;
    document.getElementById("buy-link").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: LicenceService.getCheckoutUrl() });
    });
  }, 3000);
}

licenceInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") licenceSubmit.click();
});

function showPremiumActive() {
  premiumInactive.classList.add("hidden");
  premiumInput.classList.remove("visible");
  premiumInput.classList.add("hidden");
  premiumActive.classList.remove("hidden");
}

function showPremiumInactive() {
  premiumInactive.classList.remove("hidden");
  premiumActive.classList.add("hidden");
  premiumInput.classList.remove("visible");
  premiumInput.classList.add("hidden");
}

// ============================================================
// Add Game
// ============================================================
async function addGame(appId, name) {
  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];

  if (games.find(g => g.appId === appId)) return;

  // Free tier limit
  if (!isPremium && games.length >= 5) {
    showLimitWarning();
    return;
  }

  const details = await SteamAPI.getAppDetails(appId);

  if (!details) {
    // Still add it but with basic info - prices will update on next check
    const game = details || {
      appId: appId,
      name: name,
      capsuleUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      storeUrl: `https://store.steampowered.com/app/${appId}`,
      isFree: false,
      released: true,
      currentPrice: null,
      originalPrice: null,
      discountPercent: 0,
      currency: "GBP"
    };

    game.dateAdded = Date.now();
    
    // Try to get deal score from ITAD
    if (isPremium) {
      try {
        const gameId = await ITAD_API.getGameByAppId(game.appId);
        if (gameId) {
          const deals = await ITAD_API.getPrices(gameId);
          if (deals && deals.length > 0) {
            let lowestEver = null;
            for (const deal of deals) {
              if (deal.historyLow !== null && (lowestEver === null || deal.historyLow < lowestEver)) {
                lowestEver = deal.historyLow;
              }
            }
            if (lowestEver !== null && game.originalPrice > 0 && game.currentPrice > 0) {
              game.historyLow = lowestEver;
              const range = game.originalPrice - lowestEver;
              if (range > 0) {
                game.dealScore = Math.round((1 - (game.currentPrice - lowestEver) / range) * 100);
                game.dealScore = Math.max(0, Math.min(100, game.dealScore));
              }
            }
          }
        }
      } catch (e) {
        // Silently fail - deal score will appear later
      }
    }

    games.push(game);
  } else {
    games.push(details);
  }

  await chrome.storage.local.set({ trackedGames: games });

  const targets = (await chrome.storage.local.get(["priceTargets"])).priceTargets || {};
  emptyState.classList.add("hidden");
  importHint.classList.remove("hidden");
  renderGames(games, targets);
}

// ============================================================
// Remove Game
// ============================================================
async function removeGame(appId) {
  const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  const games = (data.trackedGames || []).filter(g => g.appId !== appId);
  const targets = data.priceTargets || {};
  delete targets[appId];

  await chrome.storage.local.set({ trackedGames: games, priceTargets: targets });

  if (games.length === 0) {
    emptyState.classList.remove("hidden");
    importHint.classList.add("hidden");
    watchingCount.textContent = "0";
    dealsCount.textContent = "";
    dealsSection.classList.add("hidden");
    gamesList.innerHTML = "";
  } else {
    renderGames(games, targets);
  }
}

// ============================================================
// Render Games
// ============================================================
function renderGames(games, targets) {
  detectCurrency(games);

  const deals = [];
  const watching = [];

  for (const game of games) {
    const target = targets[game.appId];
    const isOnSale = game.discountPercent > 0;
    const hitTarget = target && game.currentPrice !== null && game.currentPrice <= target;

    if (isOnSale || hitTarget) {
      deals.push(game);
    } else {
      watching.push(game);
    }
  }

  if (deals.length > 0) {
    deals.sort((a, b) => b.discountPercent - a.discountPercent);
    dealsSection.classList.remove("hidden");
    dealsCount.textContent = deals.length;
    dealsList.innerHTML = deals.map(game => renderGameCard(game, targets[game.appId], true)).join("");
  } else {
    dealsSection.classList.add("hidden");
    dealsCount.textContent = "";
  }

  // Sort watching list
  switch (currentSort) {
    case "name":
      watching.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price-low":
      watching.sort((a, b) => (a.currentPrice || 999) - (b.currentPrice || 999));
      break;
    case "price-high":
      watching.sort((a, b) => (b.currentPrice || 0) - (a.currentPrice || 0));
      break;
    case "discount":
      watching.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
      break;
    case "added":
      watching.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
      break;
  }

  const totalGames = deals.length + watching.length;
  if (isPremium) {
    watchingCount.textContent = watching.length;
  } else {
    watchingCount.textContent = `${watching.length} (${totalGames}/5)`;
  }

  gamesList.innerHTML = watching.map(game => renderGameCard(game, targets[game.appId], false)).join("");

  attachGameListeners(targets);
}

function renderGameCard(game, target, isDeal) {
  let priceHtml = "";

  if (!game.released) {
    priceHtml = `<span class="game-not-released">Not released</span>`;
  } else if (game.isFree) {
    priceHtml = `<span class="game-price">Free</span>`;
  } else if (game.currentPrice !== null) {
    const onSaleClass = game.discountPercent > 0 ? "on-sale" : "";
    priceHtml = `<span class="game-price ${onSaleClass}">${currentCurrencySymbol}${game.currentPrice.toFixed(2)}</span>`;

    if (game.discountPercent > 0) {
      priceHtml += `<br><span class="game-original-price">${currentCurrencySymbol}${game.originalPrice.toFixed(2)}</span>`;
      priceHtml += ` <span class="game-discount">-${game.discountPercent}%</span>`;
    }

    if (isPremium && game.dealScore !== undefined && game.dealScore !== null) {
      priceHtml += `<br><span title="${game.dealScore === 100 ? 'This is the lowest price ever!' : `${game.dealScore}% as good as the lowest price ever`}" class="deal-score ${getDealScoreClass(game.dealScore)}">${game.dealScore}% deal</span>`;
    }
  } else {
    priceHtml = `<span class="game-not-released">Price unavailable</span>`;
  }

  return `
    <div class="game-card ${isDeal ? 'on-sale' : ''}" data-appid="${game.appId}" data-url="${game.storeUrl}">
      <img class="game-image" src="${game.capsuleUrl}" alt="${game.name}" title="${game.name}" loading="lazy">
      <div class="game-info">
        <div class="game-name" title="${game.name}">${game.name}</div>
        <div class="target-row">
          <div class="target-input-group">
            <input class="target-input ${target && game.currentPrice !== null && game.currentPrice <= target ? 'target-hit' : ''}" type="number" step="0.01" min="0"
              data-appid="${game.appId}"
              placeholder="${currentCurrencySymbol} target"
              value="${target ? target.toFixed(2) : ''}">
              ${isPremium ? `<button class="compare-btn" data-appid="${game.appId}" data-name="${game.name}" title="Compare prices"><svg viewBox="0 0 24 24" class="compare-icon"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM13 20.01L4 11V4h7v-.01l9 9-7 7.02zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg></button>` : ''}
          </div>
        </div>
        ${game.lastDrop ? `<span class="last-drop">Dropped ${formatTimeAgo(game.lastDrop)}</span>` : ''}
        <div class="compare-list hidden" id="compare-${game.appId}"></div>
      </div>
      <div class="game-price-section">
        ${priceHtml}
      </div>
      <button class="game-remove" data-appid="${game.appId}" title="Remove">x</button>
    </div>
  `;
}

function getDealScoreClass(score) {
  if (score >= 90) return "deal-amazing";
  if (score >= 70) return "deal-great";
  if (score >= 50) return "deal-good";
  return "deal-ok";
}

function attachGameListeners(targets) {
  document.querySelectorAll(".game-card").forEach(card => {
    card.addEventListener("click", () => {
      if (inputFocused) return;
      chrome.tabs.create({ url: card.dataset.url });
    });
  });

  document.querySelectorAll(".target-input").forEach(input => {
    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("focus", (e) => {
      e.stopPropagation();
      inputFocused = true;
    });
    input.addEventListener("blur", () => {
      // Small delay so the click event on the card doesn't fire immediately
      setTimeout(() => { inputFocused = false; }, 200);
    });
  });

  // Compare buttons (premium)
  document.querySelectorAll(".compare-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const appId = btn.dataset.appid;
      const name = btn.dataset.name;
      loadComparison(appId, name);
    });
  });

  document.querySelectorAll(".game-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeGame(parseInt(btn.dataset.appid));
    });
  });

  document.querySelectorAll(".target-input").forEach(input => {
    input.addEventListener("change", async (e) => {
      const appId = parseInt(e.target.dataset.appid);
      const value = parseFloat(e.target.value);

      const data = await chrome.storage.local.get(["priceTargets", "trackedGames"]);
      const updatedTargets = data.priceTargets || {};

      if (isNaN(value) || value <= 0) {
        delete updatedTargets[appId];
      } else {
        updatedTargets[appId] = value;
      }

      await chrome.storage.local.set({ priceTargets: updatedTargets });
      renderGames(data.trackedGames || [], updatedTargets);
    });
  });
}

async function showLimitWarning() {
  const confirmed = await showModal(
    "Free tier is limited to 5 games. Upgrade to Premium for unlimited tracking and price comparison across multiple stores.",
    "Upgrade",
    false
  );

  if (confirmed) {
    chrome.tabs.create({ url: LicenceService.getCheckoutUrl() });
  }
}

async function loadComparison(appId, name) {
  const btn = document.querySelector(`.compare-btn[data-appid="${appId}"]`);

  // Check cache
  const cached = compareCache[appId];
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    openCompareModal(cached.deals, name, appId);
    return;
  }

  // Show loading state
  if (btn) {
    btn.classList.add("loading");
    btn.innerHTML = '<div class="spinner-tiny"></div>';
  }

  const deals = await ITAD_API.getDealsForSteamApp(appId, name);

  // Restore icon
  if (btn) {
    btn.classList.remove("loading");
    btn.innerHTML = '<svg viewBox="0 0 24 24" class="compare-icon"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM13 20.01L4 11V4h7v-.01l9 9-7 7.02zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>';
  }

  if (!deals || deals.length === 0) {
    if (btn) {
      btn.classList.add("flash-red");
      btn.innerHTML = '<span style="font-size:9px;color:white;">0</span>';
      setTimeout(() => {
        btn.classList.remove("flash-red");
        btn.innerHTML = '<svg viewBox="0 0 24 24" class="compare-icon"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM13 20.01L4 11V4h7v-.01l9 9-7 7.02zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>';
      }, 1000);
    }
    return;
  }

  // Cache
  compareCache[appId] = { deals, timestamp: Date.now() };

  openCompareModal(deals, name, appId);
}

async function openCompareModal(deals, name, appId) {
  // Get currency symbol
  const dealCurrency = deals[0]?.currency || "GBP";
  const symbols = { "GBP": "\u00A3", "USD": "$", "EUR": "\u20AC" };
  const symbol = symbols[dealCurrency] || dealCurrency + " ";

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) return;

  // Inject the compare modal script
    try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/compare-modal.js"]
    });

    await chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_COMPARE",
      deals,
      name,
      appId: appId.toString(),
      symbol
    });

    // Close the popup
    window.close();
  } catch (e) {}
}

// ============================================================
// Check Now
// ============================================================
checkNowBtn.addEventListener("click", async () => {
  checkNowBtn.classList.add("spinning");

  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];

  if (games.length === 0) {
    checkNowBtn.classList.remove("spinning");
    return;
  }

  const regionData = await chrome.storage.local.get(["region"]);
  const cc = regionData.region || "gb";

  for (let i = 0; i < games.length; i++) {
    const details = await SteamAPI.getAppDetails(games[i].appId, cc);
    if (details) {
      games[i].currentPrice = details.currentPrice;
      games[i].originalPrice = details.originalPrice;
      games[i].discountPercent = details.discountPercent;
      games[i].currency = details.currency;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  await chrome.storage.local.set({ trackedGames: games, lastChecked: Date.now() });

  const targets = (await chrome.storage.local.get(["priceTargets"])).priceTargets || {};
  renderGames(games, targets);
  updateLastChecked();

  checkNowBtn.classList.remove("spinning");
});

// ============================================================
// Clear All
// ============================================================
clearBtn.addEventListener("click", async () => {
  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];

  if (games.length === 0) return;

  const confirmed = await showModal(
    `Remove all ${games.length} tracked games? This cannot be undone.`,
    "Remove All",
    true
  );

  if (!confirmed) return;

  await chrome.storage.local.set({ trackedGames: [], priceTargets: {} });

  emptyState.classList.remove("hidden");
  importHint.classList.add("hidden");
  dealsSection.classList.add("hidden");
  dealsList.innerHTML = "";
  gamesList.innerHTML = "";
  watchingCount.textContent = "0";
  dealsCount.textContent = "";
});

// ============================================================
// Import from Wishlist Page
// ============================================================
async function checkForWishlistPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes("store.steampowered.com/wishlist")) {
      importSection.classList.remove("hidden");
    }
  } catch (e) {
    // No access to tab URL
  }
}

importPageBtn.addEventListener("click", async () => {
  importPageBtn.disabled = true;
  importPageBtn.textContent = "Importing...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_GAMES" });

    if (response && response.games && response.games.length > 0) {
      // Enforce limit for free users
      let gamesToImport = response.games;
      if (!isPremium) {
        const existing = await chrome.storage.local.get(["trackedGames"]);
        const currentCount = (existing.trackedGames || []).length;
        const remaining = 5 - currentCount;

        if (remaining <= 0) {
          showLimitWarning();
          importPageBtn.textContent = "Import Wishlist From This Page";
          importPageBtn.disabled = false;
          return;
        }

        if (gamesToImport.length > remaining) {
          gamesToImport = gamesToImport.slice(0, remaining);
        }
      }

      await chrome.runtime.sendMessage({ type: "IMPORT_WISHLIST", games: gamesToImport });

      importPageBtn.textContent = `Imported ${response.games.length} games!`;

      setTimeout(async () => {
        const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
        const games = data.trackedGames || [];
        const targets = data.priceTargets || {};
        emptyState.classList.add("hidden");
        importHint.classList.remove("hidden");
        renderGames(games, targets);
        importPageBtn.textContent = "Import wishlist from this page";
        importPageBtn.disabled = false;
      }, 1500);
    } else {
      importPageBtn.textContent = "No games found on this page";
      setTimeout(() => {
        importPageBtn.textContent = "Import wishlist from this page";
        importPageBtn.disabled = false;
      }, 2000);
    }
  } catch (e) {
    importPageBtn.textContent = "Could not read page - try refreshing";
    setTimeout(() => {
      importPageBtn.textContent = "Import wishlist from this page";
      importPageBtn.disabled = false;
    }, 2000);
  }
});

regionSelect.addEventListener("change", async (e) => {
  const region = e.target.value;
  await chrome.storage.local.set({ region });

  // Update currency symbol immediately
  if (REGION_CURRENCY[region]) {
    currentCurrencySymbol = REGION_CURRENCY[region].symbol;
  }

  // Re-render with new symbol immediately (prices will update after fetch)
  const gameData = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  const games = gameData.trackedGames || [];
  const targets = gameData.priceTargets || {};

  if (games.length > 0) {
    renderGames(games, targets);
  }

  // Then re-fetch prices with new region
  if (games.length === 0) return;

  checkNowBtn.classList.add("spinning");

  const regionData = await chrome.storage.local.get(["region"]);
  const cc = regionData.region || "gb";

  for (let i = 0; i < games.length; i++) {
    const details = await SteamAPI.getAppDetails(games[i].appId, cc);
    if (details) {
      games[i].currentPrice = details.currentPrice;
      games[i].originalPrice = details.originalPrice;
      games[i].discountPercent = details.discountPercent;
      games[i].currency = details.currency;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  await chrome.storage.local.set({ trackedGames: games, lastChecked: Date.now() });

  renderGames(games, (await chrome.storage.local.get(["priceTargets"])).priceTargets || {});
  updateLastChecked();

  checkNowBtn.classList.remove("spinning");
});

// ============================================================
// Start
// ============================================================
init();