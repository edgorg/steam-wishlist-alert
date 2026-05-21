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

let searchTimeout = null;
let currentCurrencySymbol = "\u00A3";

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
  const data = await chrome.storage.local.get(["theme", "notifications", "region"]);

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
  if (REGION_CURRENCY[region]) {
    currentCurrencySymbol = REGION_CURRENCY[region].symbol;
  }
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

// ============================================================
// Search
// ============================================================
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();

  clearTimeout(searchTimeout);

  if (query.length < 2) {
    searchResults.classList.add("hidden");
    return;
  }

  searchTimeout = setTimeout(async () => {
    const results = await SteamAPI.searchGame(query);
    renderSearchResults(results);
  }, 400);
});

function renderSearchResults(results) {
  if (results.length === 0) {
    searchResults.classList.add("hidden");
    return;
  }

  searchResults.classList.remove("hidden");
  searchResults.innerHTML = results.slice(0, 5).map(game => `
    <div class="search-result" data-appid="${game.appId}" data-name="${game.name}">
      <img class="search-result-image" src="${game.capsuleUrl}" alt="${game.name}" loading="lazy">
      <span class="search-result-name">${game.name}</span>
      <span class="search-result-add">+ Add</span>
    </div>
  `).join("");

  searchResults.querySelectorAll(".search-result").forEach(el => {
    el.addEventListener("click", async () => {
      const appId = parseInt(el.dataset.appid);
      const name = el.dataset.name;

      await addGame(appId, name);
      searchInput.value = "";
      searchResults.classList.add("hidden");
    });
  });
}

// ============================================================
// Add Game
// ============================================================
async function addGame(appId, name) {
  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];

  if (games.find(g => g.appId === appId)) return;

  const details = await SteamAPI.getAppDetails(appId);

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

  games.push(game);
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

  watchingCount.textContent = watching.length;
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
  } else {
    priceHtml = `<span class="game-not-released">Price unavailable</span>`;
  }

  const targetDisplay = target
    ? `<span class="target-label ${game.currentPrice !== null && game.currentPrice <= target ? 'target-hit' : ''}">Target: ${currentCurrencySymbol}${target.toFixed(2)}</span>`
    : "";

  return `
    <div class="game-card ${isDeal ? 'on-sale' : ''}" data-appid="${game.appId}" data-url="${game.storeUrl}">
      <img class="game-image" src="${game.capsuleUrl}" alt="${game.name}" loading="lazy">
      <div class="game-info">
        <div class="game-name" title="${game.name}">${game.name}</div>
        <div class="target-row">
          <input class="target-input" type="number" step="0.01" min="0"
            data-appid="${game.appId}"
            placeholder="${currentCurrencySymbol} target"
            value="${target ? target.toFixed(2) : ''}">
          ${targetDisplay}
        </div>
      </div>
      <div class="game-price-section">
        ${priceHtml}
      </div>
      <button class="game-remove" data-appid="${game.appId}" title="Remove">x</button>
    </div>
  `;
}

function attachGameListeners(targets) {
  document.querySelectorAll(".game-card").forEach(card => {
    card.addEventListener("click", () => {
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

  document.querySelectorAll(".game-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeGame(parseInt(btn.dataset.appid));
    });
  });
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

  for (let i = 0; i < games.length; i++) {
    const details = await SteamAPI.getAppDetails(games[i].appId);
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
      await chrome.runtime.sendMessage({ type: "IMPORT_WISHLIST", games: response.games });

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

  for (let i = 0; i < games.length; i++) {
    const details = await SteamAPI.getAppDetails(games[i].appId);
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