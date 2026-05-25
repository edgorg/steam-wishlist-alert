importScripts("../services/config.js");

// Set up price check alarm
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("priceCheck", { periodInMinutes: 120 }); // Every 2 hours
  console.log("Steam Wishlist Alerts installed");
});

// Handle alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "priceCheck") {
    await checkPrices();
    await updateHistoryLows();
  }
});

// Handle messages from content script (wishlist import)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "QUICK_ADD_GAME") {
    handleQuickAdd(message.appId, message.name).then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (message.type === "IMPORT_WISHLIST") {
    importWishlist(message.games).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Import wishlist from content script
async function importWishlist(games) {
  const data = await chrome.storage.local.get(["trackedGames", "premium"]);
  const existing = data.trackedGames || [];
  const existingIds = new Set(existing.map(g => g.appId));
  const isPremium = data.premium || false;
  const limit = isPremium ? Infinity : 5;

  let added = 0;

  for (const game of games) {
    if (existingIds.has(game.appId)) continue;
    if (existing.length >= limit) break;

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
      currency: "GBP"
    });

    added++;
  }

  await chrome.storage.local.set({ trackedGames: existing });
  console.log(`Imported ${added} new games (${existing.length} total)`);

  // Fetch prices for new games in background
  await checkPrices();
}

async function handleQuickAdd(appId, name) {
  const data = await chrome.storage.local.get(["trackedGames", "premium"]);
  const games = data.trackedGames || [];
  const isPremium = data.premium || false;

  // Check if already tracked
  if (games.find(g => g.appId === appId)) {
    return { success: true, alreadyTracked: true };
  }

  // Check free tier limit
  if (!isPremium && games.length >= 5) {
    return { success: false, error: "Limit reached (5 games)" };
  }

  // Fetch game details
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`
    );

    let game = {
      appId: appId,
      name: name,
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
        const priceOverview = details.price_overview;

        game.name = details.name || name;
        game.isFree = details.is_free || false;
        game.released = !details.release_date?.coming_soon;
        game.currentPrice = priceOverview ? priceOverview.final / 100 : 0;
        game.originalPrice = priceOverview ? priceOverview.initial / 100 : 0;
        game.discountPercent = priceOverview ? priceOverview.discount_percent : 0;
        game.currency = priceOverview?.currency || "GBP";
      }
    }

    games.push(game);
    await chrome.storage.local.set({ trackedGames: games });

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to add" };
  }
}

// Check prices for all tracked games
async function checkPrices() {
  const data = await chrome.storage.local.get(["trackedGames", "priceTargets", "notifications", "region"]);
  const cc = data.region || "gb";
  const games = data.trackedGames || [];
  const targets = data.priceTargets || {};
  const notificationsEnabled = data.notifications !== "off";

  if (games.length === 0) return;

  console.log(`Checking prices for ${games.length} games...`);

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
      const priceOverview = details.price_overview;

      const previousPrice = game.currentPrice;

      game.name = details.name || game.name;
      game.released = !details.release_date?.coming_soon;
      game.isFree = details.is_free || false;
      game.currentPrice = priceOverview ? priceOverview.final / 100 : 0;
      game.originalPrice = priceOverview ? priceOverview.initial / 100 : 0;
      game.discountPercent = priceOverview ? priceOverview.discount_percent : 0;
      game.currency = priceOverview?.currency || "GBP";

      // Calculate deal score if we have history low data
      if (game.historyLow && game.originalPrice > 0 && game.currentPrice > 0) {
        const range = game.originalPrice - game.historyLow;
        if (range > 0) {
          game.dealScore = Math.round((1 - (game.currentPrice - game.historyLow) / range) * 100);
          game.dealScore = Math.max(0, Math.min(100, game.dealScore));
        }
      }

      const target = targets[game.appId];

      if (notificationsEnabled && previousPrice !== null && game.currentPrice < previousPrice) {
        const saving = (previousPrice - game.currentPrice).toFixed(2);
        const symbol = getCurrencySymbol(game.currency);

        game.lastDrop = Date.now();

        if ((target && game.currentPrice <= target) || game.discountPercent >= 20) {
          chrome.notifications.create(`deal-${game.appId}`, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon128.png"),
            title: "Price Drop!",
            message: `${game.name} is now ${symbol}${game.currentPrice.toFixed(2)} (was ${symbol}${previousPrice.toFixed(2)}) - Save ${symbol}${saving}!`
          });
          priceDrops++;
        }
      }
    } catch (e) {
      console.warn(`Price check failed for ${game.name}: ${e.message}`);
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

  console.log(`Price check complete. ${priceDrops} drops found.`);
}

function getCurrencySymbol(cc) {
  const symbols = {
    gb: "\u00A3",
    us: "$",
    eu: "\u20AC",
    au: "A$",
    ca: "C$",
    jp: "\u00A5",
    br: "R$",
    ru: "\u20BD",
    nz: "NZ$",
    in: "\u20B9"
  };
  return symbols[cc] || "\u00A3";
}

async function updateHistoryLows() {
  const data = await chrome.storage.local.get(["trackedGames", "premium"]);
  if (!data.premium) return;
  
  const games = data.trackedGames || [];

  if (games.length === 0) return;

  for (const game of games) {
    // Skip if we already have a recent history low
    if (game.historyLowUpdated && Date.now() - game.historyLowUpdated < 7 * 24 * 60 * 60 * 1000) continue;

    try {
      // Look up game on ITAD
      const lookupResponse = await fetch(
        `https://api.isthereanydeal.com/games/lookup/v1?key=${CONFIG.ITAD_KEY}&appid=${game.appId}`
      );

      if (!lookupResponse.ok) continue;

      const lookupData = await lookupResponse.json();
      if (!lookupData.found) continue;

      const gameId = lookupData.game.id;

      // Get prices (includes history low)
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

      if (pricesData && pricesData.length > 0 && pricesData[0].deals) {
        // Find the lowest historyLow across all stores
        let lowestEver = null;
        for (const deal of pricesData[0].deals) {
          if (deal.historyLow && (lowestEver === null || deal.historyLow.amount < lowestEver)) {
            lowestEver = deal.historyLow.amount;
          }
        }

        if (lowestEver !== null) {
          game.historyLow = lowestEver;
          game.historyLowUpdated = Date.now();

          // Calculate deal score
          if (game.originalPrice > 0 && game.currentPrice > 0) {
            const range = game.originalPrice - lowestEver;
            if (range > 0) {
              game.dealScore = Math.round((1 - (game.currentPrice - lowestEver) / range) * 100);
              game.dealScore = Math.max(0, Math.min(100, game.dealScore));
            }
          }
        }
      }
    } catch (e) {
      console.warn(`History low fetch failed for ${game.name}:`, e.message);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  await chrome.storage.local.set({ trackedGames: games });
}

// Clear badge when popup opens
chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith("deal-")) {
    const appId = notificationId.replace("deal-", "");
    chrome.tabs.create({ url: `https://store.steampowered.com/app/${appId}` });
  }
});