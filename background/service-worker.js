// Set up price check alarm
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("priceCheck", { periodInMinutes: 120 }); // Every 2 hours
  console.log("Steam Wishlist Alerts installed");
});

// Handle alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "priceCheck") {
    await checkPrices();
  }
});

// Handle messages from content script (wishlist import)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPORT_WISHLIST") {
    importWishlist(message.games).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Import wishlist from content script
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
      currency: "GBP"
    });

    added++;
  }

  await chrome.storage.local.set({ trackedGames: existing });
  console.log(`Imported ${added} new games (${existing.length} total)`);

  // Fetch prices for new games in background
  await checkPrices();
}

// Check prices for all tracked games
async function checkPrices() {
  const data = await chrome.storage.local.get(["trackedGames", "priceTargets"]);
  const games = data.trackedGames || [];
  const targets = data.priceTargets || {};

  if (games.length === 0) return;

  console.log(`Checking prices for ${games.length} games...`);

  let priceDrops = 0;

  for (const game of games) {
    try {
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${game.appId}&cc=gb`
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

      // Check for price drop notification
      const target = targets[game.appId];

      if (previousPrice !== null && game.currentPrice < previousPrice) {
        const saving = (previousPrice - game.currentPrice).toFixed(2);

        // Notify if hit target or significant drop
        if ((target && game.currentPrice <= target) || game.discountPercent >= 20) {
          chrome.notifications.create(`deal-${game.appId}`, {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Price Drop!",
            message: `${game.name} is now \u00A3${game.currentPrice.toFixed(2)} (was \u00A3${previousPrice.toFixed(2)}) - Save \u00A3${saving}!`
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

  // Update badge
  if (priceDrops > 0) {
    chrome.action.setBadgeBackgroundColor({ color: "#6cc644" });
    chrome.action.setBadgeText({ text: priceDrops.toString() });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }

  console.log(`Price check complete. ${priceDrops} drops found.`);
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