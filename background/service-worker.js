importScripts("../services/config.js");

// ============================================================
// Setup
// ============================================================
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("priceCheck", { periodInMinutes: 120 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "priceCheck") {
    await checkPrices();
    await updateHistoryLows();
  }
});

// ============================================================
// Message Handling
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "QUICK_ADD_GAME") {
    handleQuickAdd(message.appId, message.name).then(sendResponse);
    return true;
  }
  if (message.type === "IMPORT_WISHLIST") {
    importWishlist(message.games).then(() => sendResponse({ success: true }));
    return true;
  }
});

// ============================================================
// Import Wishlist
// ============================================================
async function importWishlist(games) {
  const data = await chrome.storage.local.get(["trackedGames"]);
  const existing = data.trackedGames || [];
  const existingIds = new Set(existing.map(g => g.appId));
  let added = 0;

  for (const game of games) {
    if (existingIds.has(game.appId)) continue;

    existing.push({
      appId: game.appId,
      name: game.name,
      capsuleUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
      storeUrl: `https://store.steampowered.com/app/${game.appId}`,
      isFree: false,
      released: true,
      currentPrice: null,
      originalPrice: null,
      discountPercent: 0,
      currency: "GBP",
      dateAdded: Date.now()
    });
    added++;
  }

  await chrome.storage.local.set({ trackedGames: existing });
  await checkPrices();
}

// ============================================================
// Quick Add from Store Page
// ============================================================
async function handleQuickAdd(appId, name) {
  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];

  if (games.find(g => g.appId === appId)) {
    return { success: true, alreadyTracked: true };
  }

  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`
    );

    const game = {
      appId,
      name,
      capsuleUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      storeUrl: `https://store.steampowered.com/app/${appId}`,
      isFree: false,
      released: true,
      currentPrice: null,
      originalPrice: null,
      discountPercent: 0,
      currency: "GBP",
      dateAdded: Date.now()
    };

    if (response.ok) {
      const result = await response.json();
      const appData = result[appId.toString()];

      if (appData?.success && appData.data) {
        const details = appData.data;
        const price = details.price_overview;

        game.name = details.name || name;
        game.isFree = details.is_free || false;
        game.released = !details.release_date?.coming_soon;
        game.currentPrice = price ? price.final / 100 : 0;
        game.originalPrice = price ? price.initial / 100 : 0;
        game.discountPercent = price ? price.discount_percent : 0;
        game.currency = price?.currency || "GBP";
      }
    }

    games.push(game);
    await chrome.storage.local.set({ trackedGames: games });
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to add" };
  }
}

// ============================================================
// Price Checking
// ============================================================
async function checkPrices() {
  const data = await chrome.storage.local.get(["trackedGames", "priceTargets", "notifications", "region", "notifyThreshold"]);
  const cc = data.region || "gb";
  const games = data.trackedGames || [];
  const targets = data.priceTargets || {};
  const notificationsEnabled = data.notifications !== "off";
  const threshold = data.notifyThreshold ?? 20;

  if (games.length === 0) return;

  let priceDrops = 0;

  for (const game of games) {
    try {
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${game.appId}&cc=${cc}`
      );
      if (!response.ok) continue;

      const result = await response.json();
      const appData = result[game.appId.toString()];
      if (!appData?.success || !appData.data) continue;

      const details = appData.data;
      const price = details.price_overview;
      const previousPrice = game.currentPrice;

      game.name = details.name || game.name;
      game.released = !details.release_date?.coming_soon;
      game.isFree = details.is_free || false;
      game.currentPrice = price ? price.final / 100 : 0;
      game.originalPrice = price ? price.initial / 100 : 0;
      game.discountPercent = price ? price.discount_percent : 0;
      game.currency = price?.currency || "GBP";

      // Recalculate deal score
      if (game.historyLow != null && game.originalPrice > 0 && game.currentPrice > 0) {
        const range = game.originalPrice - game.historyLow;
        if (range > 0) {
          game.dealScore = Math.max(0, Math.min(100,
            Math.round((1 - (game.currentPrice - game.historyLow) / range) * 100)
          ));
        }
      }

      // Notify on price drop
      if (notificationsEnabled && previousPrice !== null && game.currentPrice < previousPrice) {
        game.lastDrop = Date.now();
        const target = targets[game.appId];
        const hitTarget = target && game.currentPrice <= target;
        const meetsThreshold = !target && game.discountPercent >= threshold;

        if (hitTarget || meetsThreshold) {
          const symbol = getCurrencySymbol(game.currency);
          const saving = (previousPrice - game.currentPrice).toFixed(2);

          chrome.notifications.create(`deal-${game.appId}`, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon128.png"),
            title: hitTarget ? "Target Price Hit!" : "Price Drop!",
            message: `${game.name} is now ${symbol}${game.currentPrice.toFixed(2)} (was ${symbol}${previousPrice.toFixed(2)}) - Save ${symbol}${saving}!`
          });
          priceDrops++;
        }
      }
    } catch (e) {
      // Skip failed games
    }

    await new Promise(r => setTimeout(r, 300));
  }

  await chrome.storage.local.set({ trackedGames: games, lastChecked: Date.now() });

  if (priceDrops > 0) {
    chrome.action.setBadgeBackgroundColor({ color: "#6cc644" });
    chrome.action.setBadgeText({ text: priceDrops.toString() });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// ============================================================
// History Lows (ITAD)
// ============================================================
async function updateHistoryLows() {
  const data = await chrome.storage.local.get(["trackedGames"]);
  const games = data.trackedGames || [];
  if (games.length === 0) return;

  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

  for (const game of games) {
    // Skip if updated recently
    if (game.historyLowUpdated && Date.now() - game.historyLowUpdated < ONE_WEEK) continue;

    try {
      const lookupResponse = await fetch(
        `https://api.isthereanydeal.com/games/lookup/v1?key=${CONFIG.ITAD_KEY}&appid=${game.appId}`
      );
      if (!lookupResponse.ok) continue;

      const lookupData = await lookupResponse.json();
      if (!lookupData.found) continue;

      const gameId = lookupData.game.id;

      const pricesResponse = await fetch(
        `https://api.isthereanydeal.com/games/prices/v2?key=${CONFIG.ITAD_KEY}&country=GB`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([gameId])
        }
      );
      if (!pricesResponse.ok) continue;

      const pricesData = await pricesResponse.json();

      if (pricesData?.[0]?.deals) {
        let lowestEver = null;
        for (const deal of pricesData[0].deals) {
          if (deal.historyLow && (lowestEver === null || deal.historyLow.amount < lowestEver)) {
            lowestEver = deal.historyLow.amount;
          }
        }

        if (lowestEver !== null) {
          game.historyLow = lowestEver;
          game.historyLowUpdated = Date.now();

          if (game.originalPrice > 0 && game.currentPrice > 0) {
            const range = game.originalPrice - lowestEver;
            if (range > 0) {
              game.dealScore = Math.max(0, Math.min(100,
                Math.round((1 - (game.currentPrice - lowestEver) / range) * 100)
              ));
            }
          }
        }
      }
    } catch (e) {
      // Skip failed lookups
    }

    await new Promise(r => setTimeout(r, 500));
  }

  await chrome.storage.local.set({ trackedGames: games });
}

// ============================================================
// Utilities
// ============================================================
function getCurrencySymbol(currency) {
  const symbols = {
    GBP: "£", USD: "$", EUR: "€", AUD: "A$", CAD: "C$",
    JPY: "¥", BRL: "R$", NZD: "NZ$", INR: "₹", CNY: "¥"
  };
  return symbols[currency] || currency;
}

// Badge & notification handling
chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("deal-")) {
    const appId = notificationId.replace("deal-", "");
    chrome.tabs.create({ url: `https://store.steampowered.com/app/${appId}` });
  }
});