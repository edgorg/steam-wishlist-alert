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
const sortSelect = document.getElementById("sort-select");
const saleBanner = document.getElementById("sale-banner");
const saleText = document.getElementById("sale-text");
const thresholdInput = document.getElementById("threshold-input");

const compareCache = {};
const CACHE_DURATION = 30 * 60 * 1000;

let searchTimeout = null;
let currentCurrencySymbol = "£";
let inputFocused = false;
let currentSort = "name";

const REGION_CURRENCY = {
  gb: { code: "GBP", symbol: "£" }, us: { code: "USD", symbol: "$" },
  eu: { code: "EUR", symbol: "€" }, au: { code: "AUD", symbol: "A$" },
  ca: { code: "CAD", symbol: "C$" }, nz: { code: "NZD", symbol: "NZ$" },
  jp: { code: "JPY", symbol: "¥" }, br: { code: "BRL", symbol: "R$" },
  in: { code: "INR", symbol: "₹" }, cn: { code: "CNY", symbol: "¥" },
  kr: { code: "KRW", symbol: "₩" }, tw: { code: "TWD", symbol: "NT$" },
  hk: { code: "HKD", symbol: "HK$" }, sg: { code: "SGD", symbol: "S$" },
  th: { code: "THB", symbol: "฿" }, my: { code: "MYR", symbol: "RM" },
  ph: { code: "PHP", symbol: "₱" }, id: { code: "IDR", symbol: "Rp" },
  vn: { code: "VND", symbol: "₫" }, za: { code: "ZAR", symbol: "R" },
  mx: { code: "MXN", symbol: "MX$" }, ar: { code: "ARS", symbol: "ARS$" },
  cl: { code: "CLP", symbol: "CLP$" }, co: { code: "COP", symbol: "COP$" },
  tr: { code: "TRY", symbol: "₺" }, ua: { code: "UAH", symbol: "₴" },
  pl: { code: "PLN", symbol: "zł" }, no: { code: "NOK", symbol: "kr" },
  se: { code: "SEK", symbol: "kr" }, dk: { code: "DKK", symbol: "kr" },
  ch: { code: "CHF", symbol: "CHF" }, ae: { code: "AED", symbol: "AED" },
  sa: { code: "SAR", symbol: "SAR" }, kw: { code: "KWD", symbol: "KWD" },
  qa: { code: "QAR", symbol: "QAR" }, pe: { code: "PEN", symbol: "S/" },
  uy: { code: "UYU", symbol: "$U" }, cr: { code: "CRC", symbol: "₡" },
  kz: { code: "KZT", symbol: "₸" }, pk: { code: "PKR", symbol: "Rs" }
};

const COMPARE_ICON_SVG = '<svg viewBox="0 0 24 24" class="compare-icon"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM13 20.01L4 11V4h7v-.01l9 9-7 7.02zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>';

// ============================================================
// Initialise
// ============================================================
async function init() {
  await loadSettings();
  initSectionOrder();

  const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  const games = data.trackedGames || [];
  const targets = data.priceTargets || {};

  if (games.length === 0) {
    showEmptyState();
  } else {
    emptyState.classList.add("hidden");
    importHint.classList.remove("hidden");
    renderGames(games, targets);
  }

  updateLastChecked();
  checkForWishlistPage();
  checkSaleCountdown();
}

function showEmptyState() {
  emptyState.classList.remove("hidden");
  importHint.classList.add("hidden");
  watchingCount.textContent = "0";
  dealsCount.textContent = "";
  dealsSection.classList.add("hidden");
  dealsList.innerHTML = "";
  gamesList.innerHTML = "";
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

    const cleanup = () => {
      modalOverlay.classList.add("hidden");
      modalConfirm.removeEventListener("click", onConfirm);
      modalCancel.removeEventListener("click", onCancel);
    };
    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    modalConfirm.addEventListener("click", onConfirm);
    modalCancel.addEventListener("click", onCancel);
  });
}

// ============================================================
// Currency
// ============================================================
function updateCurrencySymbol(region) {
  if (REGION_CURRENCY[region]) {
    currentCurrencySymbol = REGION_CURRENCY[region].symbol;
  }
}

// ============================================================
// Settings
// ============================================================
settingsBtn.addEventListener("click", () => settingsPanel.classList.toggle("hidden"));

document.addEventListener("click", (e) => {
  if (!settingsPanel.classList.contains("hidden") &&
      !settingsPanel.contains(e.target) &&
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

thresholdInput.addEventListener("change", async (e) => {
  let value = parseInt(e.target.value);
  if (isNaN(value) || value < 0) value = 0;
  if (value > 100) value = 100;
  e.target.value = value;
  await chrome.storage.local.set({ notifyThreshold: value });
});

function applyTheme(theme) {
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

async function loadSettings() {
  const data = await chrome.storage.local.get(["theme", "notifications", "region", "sortPreference", "notifyThreshold"]);

  applyTheme(data.theme || "dark");
  themeToggle.querySelectorAll(".setting-toggle").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === (data.theme || "dark"));
  });

  notificationsToggle.querySelectorAll(".setting-toggle").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === (data.notifications || "on"));
  });

  const region = data.region || "gb";
  regionSelect.value = region;
  updateCurrencySymbol(region);

  currentSort = data.sortPreference || "name";
  sortSelect.value = currentSort;
  thresholdInput.value = data.notifyThreshold ?? 20;
}

// ============================================================
// Section Order (Drag-and-Drop)
// ============================================================
function initSectionOrder() {
  const list = document.getElementById("section-order-list");
  const toggle = document.getElementById("section-order-toggle");
  const content = document.getElementById("section-order-content");
  if (!list || !toggle || !content) return;

  chrome.storage.local.get(["sectionOrderOpen", "compareSectionOrder"], (data) => {
    if (data.sectionOrderOpen) {
      toggle.classList.add("open");
      content.classList.add("open");
    }

    const order = data.compareSectionOrder || ["steam", "otherStores", "keyResellers"];
    order.forEach(id => {
      const item = list.querySelector(`[data-section="${id}"]`);
      if (item) list.appendChild(item);
    });
    updateNumbers();
  });

  toggle.addEventListener("click", () => {
    const isOpen = toggle.classList.toggle("open");
    content.classList.toggle("open");
    chrome.storage.local.set({ sectionOrderOpen: isOpen });
  });

  let draggedItem = null;

  list.addEventListener("dragstart", (e) => {
    draggedItem = e.target.closest(".order-item");
    if (!draggedItem) return;
    draggedItem.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  });

  list.addEventListener("dragend", () => {
    if (draggedItem) {
      draggedItem.classList.remove("dragging");
      draggedItem = null;
      saveOrder();
      updateNumbers();
    }
    list.querySelectorAll(".order-item").forEach(i => i.classList.remove("drag-over"));
  });

  list.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    list.querySelectorAll(".order-item").forEach(i => i.classList.remove("drag-over"));

    if (draggedItem) {
      const after = getDragAfterElement(list, e.clientY);
      after ? list.insertBefore(draggedItem, after) : list.appendChild(draggedItem);
    }
  });

  list.addEventListener("drop", (e) => e.preventDefault());

  function getDragAfterElement(container, y) {
    return [...container.querySelectorAll(".order-item:not(.dragging)")].reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
    }, { offset: -Infinity }).element;
  }

  function saveOrder() {
    const order = [...list.querySelectorAll(".order-item")].map(i => i.dataset.section);
    chrome.storage.local.set({ compareSectionOrder: order });
  }

  function updateNumbers() {
    list.querySelectorAll(".order-item").forEach((item, i) => {
      const num = item.querySelector(".order-item-number");
      if (num) num.textContent = i + 1;
    });
  }
}

// ============================================================
// Time Formatting
// ============================================================
async function updateLastChecked() {
  const data = await chrome.storage.local.get(["lastChecked"]);
  if (!data.lastChecked) {
    lastCheckedEl.textContent = "Prices not yet checked";
    return;
  }

  const diff = Date.now() - data.lastChecked;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(hrs / 24);

  if (mins < 1) lastCheckedEl.textContent = "Prices checked just now";
  else if (mins < 60) lastCheckedEl.textContent = `Prices checked ${mins} min${mins === 1 ? "" : "s"} ago`;
  else if (hrs < 24) lastCheckedEl.textContent = `Prices checked ${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  else lastCheckedEl.textContent = `Prices checked ${days} day${days === 1 ? "" : "s"} ago`;
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
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
  const trackedIds = new Set((data.trackedGames || []).map(g => g.appId));

  searchResults.classList.remove("hidden");
  searchResults.innerHTML = results.slice(0, 5).map(game => {
    const isTracked = trackedIds.has(game.appId);
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
      el.querySelector(".search-result-add").textContent = "Adding...";
      el.style.pointerEvents = "none";
      await addGame(parseInt(el.dataset.appid), el.dataset.name);
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

  const sales = [
    { name: "Spring Sale", start: new Date(year, 2, 13), end: new Date(year, 2, 20) },
    { name: "Summer Sale", start: new Date(year, 5, 26), end: new Date(year, 6, 10) },
    { name: "Autumn Sale", start: new Date(year, 10, 21), end: new Date(year, 10, 28) },
    { name: "Winter Sale", start: new Date(year, 11, 19), end: new Date(year + 1, 0, 2) },
    { name: "Spring Sale", start: new Date(year + 1, 2, 13), end: new Date(year + 1, 2, 20) },
  ];

  // Check if a sale is live
  for (const sale of sales) {
    if (now >= sale.start && now <= sale.end) {
      saleBanner.classList.remove("hidden");
      saleBanner.classList.add("sale-live");
      saleText.innerHTML = `<strong>Steam ${sale.name}</strong> is live! Ends ${formatSaleDate(sale.end)}`;
      return;
    }
  }

  // Find next upcoming sale
  const nextSale = sales.find(s => s.start > now);
  if (nextSale) {
    const daysUntil = Math.ceil((nextSale.start - now) / 86400000);
    if (daysUntil <= 30) {
      saleBanner.classList.remove("hidden");
      saleBanner.classList.remove("sale-live");
      if (daysUntil <= 1) saleText.innerHTML = `<strong>Steam ${nextSale.name}</strong> expected tomorrow`;
      else if (daysUntil <= 7) saleText.innerHTML = `<strong>Steam ${nextSale.name}</strong> expected in ${daysUntil} days`;
      else saleText.innerHTML = `<strong>Steam ${nextSale.name}</strong> expected ~${formatSaleDate(nextSale.start)}`;
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

// ============================================================
// Add / Remove Game
// ============================================================
async function addGame(appId, name) {
  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];

  if (games.find(g => g.appId === appId)) return;

  let game = await SteamAPI.getAppDetails(appId);

  if (!game) {
    game = {
      appId, name,
      capsuleUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      storeUrl: `https://store.steampowered.com/app/${appId}`,
      isFree: false, released: true,
      currentPrice: null, originalPrice: null, discountPercent: 0,
      currency: "GBP"
    };
  }

  game.dateAdded = Date.now();

  // Try to get deal score
  try {
    const gameId = await ITAD_API.getGameByAppId(appId);
    if (gameId) {
      const deals = await ITAD_API.getPrices(gameId);
      if (deals.length > 0) {
        const lowestEver = Math.min(...deals.filter(d => d.historyLow !== null).map(d => d.historyLow));
        if (isFinite(lowestEver) && game.originalPrice > 0 && game.currentPrice > 0) {
          game.historyLow = lowestEver;
          const range = game.originalPrice - lowestEver;
          if (range > 0) {
            game.dealScore = Math.max(0, Math.min(100,
              Math.round((1 - (game.currentPrice - lowestEver) / range) * 100)
            ));
          }
        }
      }
    }
  } catch (e) { /* Deal score will appear on next background update */ }

  games.push(game);
  await chrome.storage.local.set({ trackedGames: games });

  const targets = (await chrome.storage.local.get(["priceTargets"])).priceTargets || {};
  emptyState.classList.add("hidden");
  importHint.classList.remove("hidden");
  renderGames(games, targets);
}

async function removeGame(appId) {
  const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  const games = (data.trackedGames || []).filter(g => g.appId !== appId);
  const targets = data.priceTargets || {};
  delete targets[appId];

  await chrome.storage.local.set({ trackedGames: games, priceTargets: targets });

  if (games.length === 0) {
    showEmptyState();
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
    (isOnSale || hitTarget ? deals : watching).push(game);
  }

  // Deals section
  if (deals.length > 0) {
    deals.sort((a, b) => b.discountPercent - a.discountPercent);
    dealsSection.classList.remove("hidden");
    dealsCount.textContent = deals.length;
    dealsList.innerHTML = deals.map(g => renderGameCard(g, targets[g.appId], true)).join("");
  } else {
    dealsSection.classList.add("hidden");
    dealsCount.textContent = "";
  }

  // Sort watching list
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name),
    "price-low": (a, b) => (a.currentPrice || 999) - (b.currentPrice || 999),
    "price-high": (a, b) => (b.currentPrice || 0) - (a.currentPrice || 0),
    discount: (a, b) => (b.discountPercent || 0) - (a.discountPercent || 0),
    added: (a, b) => (b.dateAdded || 0) - (a.dateAdded || 0)
  };
  watching.sort(sorters[currentSort] || sorters.name);

  watchingCount.textContent = watching.length;
  gamesList.innerHTML = watching.map(g => renderGameCard(g, targets[g.appId], false)).join("");

  attachGameListeners();
}

function renderGameCard(game, target, isDeal) {
  let priceHtml = "";

  if (!game.released) {
    priceHtml = '<span class="game-not-released">Not released</span>';
  } else if (game.isFree) {
    priceHtml = '<span class="game-price">Free</span>';
  } else if (game.currentPrice !== null) {
    const s = currentCurrencySymbol;
    priceHtml = `<span class="game-price ${game.discountPercent > 0 ? 'on-sale' : ''}">${s}${game.currentPrice.toFixed(2)}</span>`;

    if (game.discountPercent > 0) {
      priceHtml += `<br><span class="game-original-price">${s}${game.originalPrice.toFixed(2)}</span>`;
      priceHtml += ` <span class="game-discount">-${game.discountPercent}%</span>`;
    }

    if (game.dealScore != null) {
      const tip = game.dealScore === 100 ? 'This is the lowest price ever!' : `${game.dealScore}% as good as the lowest price ever`;
      priceHtml += `<br><span title="${tip}" class="deal-score ${getDealScoreClass(game.dealScore)}">${game.dealScore}% deal</span>`;
    }
  } else {
    priceHtml = '<span class="game-not-released">Price unavailable</span>';
  }

  const targetHit = target && game.currentPrice !== null && game.currentPrice <= target;

  return `
    <div class="game-card ${isDeal ? 'on-sale' : ''}" data-appid="${game.appId}" data-url="${game.storeUrl}">
      <img class="game-image" src="${game.capsuleUrl}" alt="${game.name}" title="${game.name}" loading="lazy">
      <div class="game-info">
        <div class="game-name" title="${game.name}">${game.name}</div>
        <div class="target-row">
          <div class="target-input-group">
            <input class="target-input ${targetHit ? 'target-hit' : ''}" type="number" step="0.01" min="0"
              data-appid="${game.appId}" placeholder="${currentCurrencySymbol} target"
              value="${target ? target.toFixed(2) : ''}">
            <button class="compare-btn" data-appid="${game.appId}" data-name="${game.name}" title="Compare prices">${COMPARE_ICON_SVG}</button>
          </div>
        </div>
        ${game.lastDrop ? `<span class="last-drop">Dropped ${formatTimeAgo(game.lastDrop)}</span>` : ''}
      </div>
      <div class="game-price-section">${priceHtml}</div>
      <button class="game-remove" data-appid="${game.appId}" title="Remove">×</button>
    </div>
  `;
}

function getDealScoreClass(score) {
  if (score >= 90) return "deal-amazing";
  if (score >= 70) return "deal-great";
  if (score >= 50) return "deal-good";
  return "deal-ok";
}

function attachGameListeners() {
  document.querySelectorAll(".game-card").forEach(card => {
    card.addEventListener("click", () => {
      if (!inputFocused) chrome.tabs.create({ url: card.dataset.url });
    });
  });

  document.querySelectorAll(".target-input").forEach(input => {
    input.addEventListener("click", e => e.stopPropagation());
    input.addEventListener("mousedown", e => e.stopPropagation());
    input.addEventListener("focus", e => { e.stopPropagation(); inputFocused = true; });
    input.addEventListener("blur", () => setTimeout(() => { inputFocused = false; }, 200));

    input.addEventListener("change", async (e) => {
      const appId = parseInt(e.target.dataset.appid);
      const value = parseFloat(e.target.value);
      const data = await chrome.storage.local.get(["priceTargets", "trackedGames"]);
      const targets = data.priceTargets || {};

      if (isNaN(value) || value <= 0) delete targets[appId];
      else targets[appId] = value;

      await chrome.storage.local.set({ priceTargets: targets });
      renderGames(data.trackedGames || [], targets);
    });
  });

  document.querySelectorAll(".compare-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadComparison(btn.dataset.appid, btn.dataset.name);
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
// Price Comparison
// ============================================================
async function loadComparison(appId, name) {
  const btn = document.querySelector(`.compare-btn[data-appid="${appId}"]`);

  // Check cache
  const cached = compareCache[appId];
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    openCompareModal(cached.deals, name, appId);
    return;
  }

  if (btn) {
    btn.classList.add("loading");
    btn.innerHTML = '<div class="spinner-tiny"></div>';
  }

  const deals = await ITAD_API.getDealsForSteamApp(appId, name);

  if (btn) {
    btn.classList.remove("loading");
    btn.innerHTML = COMPARE_ICON_SVG;
  }

  if (!deals || deals.length === 0) {
    if (btn) {
      btn.classList.add("flash-red");
      btn.innerHTML = '<span style="font-size:9px;color:white;">0</span>';
      setTimeout(() => {
        btn.classList.remove("flash-red");
        btn.innerHTML = COMPARE_ICON_SVG;
      }, 1000);
    }
    return;
  }

  compareCache[appId] = { deals, timestamp: Date.now() };
  openCompareModal(deals, name, appId);
}

async function openCompareModal(deals, name, appId) {
  const symbols = { GBP: "£", USD: "$", EUR: "€" };
  const symbol = symbols[deals[0]?.currency] || (deals[0]?.currency + " ") || "£";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/compare-modal.js"]
    });

    await chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_COMPARE", deals, name,
      appId: appId.toString(), symbol
    });

    window.close();
  } catch (e) { /* Cannot inject into this page */ }
}

// ============================================================
// Check Now
// ============================================================
checkNowBtn.addEventListener("click", async () => {
  checkNowBtn.classList.add("spinning");

  const data = await chrome.storage.local.get(["trackedGames", "region"]);
  const games = data.trackedGames || [];
  const cc = data.region || "gb";

  if (games.length === 0) {
    checkNowBtn.classList.remove("spinning");
    return;
  }

  for (const game of games) {
    const details = await SteamAPI.getAppDetails(game.appId, cc);
    if (details) {
      game.currentPrice = details.currentPrice;
      game.originalPrice = details.originalPrice;
      game.discountPercent = details.discountPercent;
      game.currency = details.currency;
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
    "Remove All", true
  );
  if (!confirmed) return;

  await chrome.storage.local.set({ trackedGames: [], priceTargets: {} });
  showEmptyState();
});

// ============================================================
// Import from Wishlist Page
// ============================================================
async function checkForWishlistPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url?.includes("store.steampowered.com/wishlist")) {
      importSection.classList.remove("hidden");
    }
  } catch (e) { /* No access to tab URL */ }
}

importPageBtn.addEventListener("click", async () => {
  importPageBtn.disabled = true;
  importPageBtn.textContent = "Importing...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_GAMES" });

    if (response?.games?.length > 0) {
      await chrome.runtime.sendMessage({ type: "IMPORT_WISHLIST", games: response.games });
      importPageBtn.textContent = `Imported ${response.games.length} games!`;

      setTimeout(async () => {
        const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
        emptyState.classList.add("hidden");
        importHint.classList.remove("hidden");
        renderGames(data.trackedGames || [], data.priceTargets || {});
        importPageBtn.textContent = "Import wishlist from this page";
        importPageBtn.disabled = false;
      }, 1500);
    } else {
      importPageBtn.textContent = "No games found on this page";
      setTimeout(() => { importPageBtn.textContent = "Import wishlist from this page"; importPageBtn.disabled = false; }, 2000);
    }
  } catch (e) {
    importPageBtn.textContent = "Could not read page - try refreshing";
    setTimeout(() => { importPageBtn.textContent = "Import wishlist from this page"; importPageBtn.disabled = false; }, 2000);
  }
});

// ============================================================
// Region Change
// ============================================================
regionSelect.addEventListener("change", async (e) => {
  const region = e.target.value;
  await chrome.storage.local.set({ region });
  updateCurrencySymbol(region);

  const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  const games = data.trackedGames || [];
  const targets = data.priceTargets || {};

  if (games.length > 0) renderGames(games, targets);
  if (games.length === 0) return;

  checkNowBtn.classList.add("spinning");

  for (const game of games) {
    const details = await SteamAPI.getAppDetails(game.appId, region);
    if (details) {
      game.currentPrice = details.currentPrice;
      game.originalPrice = details.originalPrice;
      game.discountPercent = details.discountPercent;
      game.currency = details.currency;
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