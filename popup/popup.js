// ============================================================
// DOM Elements
// ============================================================
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

const dealsSection = document.getElementById("deals-section");
const dealsList = document.getElementById("deals-list");
const dealsCount = document.getElementById("deals-count");

const gamesList = document.getElementById("games-list");
const watchingCount = document.getElementById("watching-count");
const emptyState = document.getElementById("empty-state");
const importHint = document.getElementById("import-hint");

const clearBtn = document.getElementById("clear-btn");
const refreshBtn = document.getElementById("refresh-btn");

const importSection = document.getElementById("import-section");
const importPageBtn = document.getElementById("import-page-btn");

let searchTimeout = null;

// ============================================================
// Initialise
// ============================================================
async function init() {
  const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  const games = data.trackedGames || [];
  const targets = data.priceTargets || {};

  if (games.length === 0) {
    emptyState.classList.remove("hidden");
    importHint.classList.add("hidden");
    watchingCount.textContent = "0";
    dealsCount.textContent = "";
    dealsSection.classList.add("hidden");
    gamesList.innerHTML = "";
  } else {
    emptyState.classList.add("hidden");
    importHint.classList.remove("hidden");
    renderGames(games, targets);
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

  // Check if already tracking
  if (games.find(g => g.appId === appId)) return;

  // Get full details
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

  // Re-render
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
  }

  renderGames(games, targets);
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

  // Deals
  if (deals.length > 0) {
    dealsSection.classList.remove("hidden");
    dealsCount.textContent = deals.length;
    dealsList.innerHTML = deals.map(game => renderGameCard(game, targets[game.appId], true)).join("");
  } else {
    dealsSection.classList.add("hidden");
  }

  // Watching
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
    priceHtml = `<span class="game-price ${onSaleClass}">\u00A3${game.currentPrice.toFixed(2)}</span>`;

    if (game.discountPercent > 0) {
      priceHtml += `<br><span class="game-original-price">\u00A3${game.originalPrice.toFixed(2)}</span>`;
      priceHtml += ` <span class="game-discount">-${game.discountPercent}%</span>`;
    }
  } else {
    priceHtml = `<span class="game-not-released">Price unavailable</span>`;
  }

  const targetDisplay = target
    ? `<span class="target-label ${game.currentPrice !== null && game.currentPrice <= target ? 'target-hit' : ''}">Target: \u00A3${target.toFixed(2)}</span>`
    : "";

  return `
    <div class="game-card ${isDeal ? 'on-sale' : ''}" data-appid="${game.appId}" data-url="${game.storeUrl}">
      <img class="game-image" src="${game.capsuleUrl}" alt="${game.name}" loading="lazy">
      <div class="game-info">
        <div class="game-name" title="${game.name}">${game.name}</div>
        <div class="target-row">
          <input class="target-input" type="number" step="0.01" min="0"
            data-appid="${game.appId}"
            placeholder="\u00A3 target"
            value="${target ? target.toFixed(2) : ''}">
          ${targetDisplay}
        </div>
      </div>
      <div class="game-price-section">
        ${priceHtml}
      </div>
      <button class="game-remove" data-appid="${game.appId}" title="Remove" onclick="event.stopPropagation()">x</button>
    </div>
  `;
}

function attachGameListeners(targets) {
  // Click card to open store page
  document.querySelectorAll(".game-card").forEach(card => {
    card.addEventListener("click", () => {
      chrome.tabs.create({ url: card.dataset.url });
    });
  });

  // Stop target input clicks from opening store page
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

  // Target input changes
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

  // Remove buttons
  document.querySelectorAll(".game-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeGame(parseInt(btn.dataset.appid));
    });
  });
}

// ============================================================
// Clear All Games
// ============================================================
clearBtn.addEventListener("click", async () => {
  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];

  if (games.length === 0) return;

  const confirmed = confirm(`Remove all ${games.length} tracked games?`);
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
// Refresh Prices
// ============================================================
refreshBtn.addEventListener("click", async () => {
  refreshBtn.classList.add("spinning");

  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];

  for (const game of games) {
    const details = await SteamAPI.getAppDetails(game.appId);
    if (details) {
      game.currentPrice = details.currentPrice;
      game.originalPrice = details.originalPrice;
      game.discountPercent = details.discountPercent;
    }
    await new Promise(r => setTimeout(r, 250));
  }

  await chrome.storage.local.set({ trackedGames: games });

  const targets = (await chrome.storage.local.get(["priceTargets"])).priceTargets || {};
  renderGames(games, targets);

  refreshBtn.classList.remove("spinning");
});

// Check if current tab is a Steam wishlist page
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

// Import from current page
importPageBtn.addEventListener("click", async () => {
  importPageBtn.disabled = true;
  importPageBtn.textContent = "Importing...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_GAMES" });

    if (response && response.games && response.games.length > 0) {
      // Send to background to import
      await chrome.runtime.sendMessage({ type: "IMPORT_WISHLIST", games: response.games });

      importPageBtn.textContent = `Imported ${response.games.length} games!`;
      importPageBtn.style.borderColor = "var(--green)";

      // Reload the game list
      setTimeout(async () => {
        const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
        const games = data.trackedGames || [];
        const targets = data.priceTargets || {};
        emptyState.classList.add("hidden");
        importHint.classList.remove("hidden");
        renderGames(games, targets);
        importPageBtn.textContent = "Import Wishlist From This Page";
        importPageBtn.disabled = false;
      }, 1500);
    } else {
      importPageBtn.textContent = "No games found on this page";
      setTimeout(() => {
        importPageBtn.textContent = "Import Wishlist From This Page";
        importPageBtn.disabled = false;
      }, 2000);
    }
  } catch (e) {
    importPageBtn.textContent = "Could not read page - try refreshing";
    setTimeout(() => {
      importPageBtn.textContent = "Import Wishlist From This Page";
      importPageBtn.disabled = false;
    }, 2000);
  }
});

checkForWishlistPage();

// ============================================================
// Start
// ============================================================
init();