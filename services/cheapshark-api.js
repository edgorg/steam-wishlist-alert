const CheapSharkAPI = {
  BASE_URL: "https://www.cheapshark.com/api/1.0",

  async searchDeals(gameTitle, steamAppId = null) {
    try {
      const encoded = encodeURIComponent(gameTitle);
      const response = await fetch(
        `${this.BASE_URL}/deals?title=${encoded}&limit=10&sortBy=Price`
      );

      if (!response.ok) return [];

      const deals = await response.json();

      let filtered = deals;

      // If we have a Steam App ID, only show deals that match it exactly
      if (steamAppId) {
        const appIdStr = steamAppId.toString();
        const exactMatches = filtered.filter(deal => deal.steamAppID === appIdStr);

        if (exactMatches.length > 0) {
          filtered = exactMatches;
        }
      }

      return filtered.map(deal => ({
        store: this.getStoreName(deal.storeID),
        storeId: deal.storeID,
        isSteam: deal.storeID === "1",
        title: deal.title,
        price: parseFloat(deal.salePrice),
        originalPrice: parseFloat(deal.normalPrice),
        discount: Math.round((1 - deal.salePrice / deal.normalPrice) * 100),
        dealUrl: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
        steamAppId: deal.steamAppID
      }));
    } catch (e) {
      console.warn("CheapShark search failed:", e.message);
      return [];
    }
  },

  getStoreName(storeId) {
    const stores = {
      "1": "Steam",
      "2": "GamersGate",
      "3": "GreenManGaming",
      "4": "Amazon",
      "6": "Direct2Drive",
      "7": "GOG",
      "8": "Origin",
      "11": "Humble Bundle",
      "13": "Uplay",
      "15": "Fanatical",
      "21": "WinGameStore",
      "23": "GameBillet",
      "24": "Voidu",
      "25": "Epic Games",
      "27": "Gamesplanet",
      "28": "Gamesload",
      "29": "2Game",
      "30": "IndieGala",
      "31": "Blizzard",
      "33": "DLGamer",
      "34": "Noctre",
      "35": "DreamGame"
    };
    return stores[storeId] || `Store ${storeId}`;
  }
};