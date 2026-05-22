const ITAD_API = {
  BASE_URL: "https://api.isthereanydeal.com",
  API_KEY: CONFIG.ITAD_KEY,

  async searchGame(title) {
    try {
      const encoded = encodeURIComponent(title);
      const response = await fetch(
        `${this.BASE_URL}/games/search/v1?key=${this.API_KEY}&title=${encoded}`
      );

      if (!response.ok) return null;

      const results = await response.json();

      if (!results || results.length === 0) return null;

      return results[0];
    } catch (e) {
      console.warn("ITAD search failed:", e.message);
      return null;
    }
  },

  async getGameByAppId(appId) {
    try {
      const url = `${this.BASE_URL}/games/lookup/v1?key=${this.API_KEY}&appid=${appId}`;
      console.log("[ITAD] Lookup URL:", url);

      const response = await fetch(url);
      console.log("[ITAD] Lookup status:", response.status);

      if (!response.ok) {
        const text = await response.text();
        console.log("[ITAD] Lookup error:", text);
        return null;
      }

      const data = await response.json();
      console.log("[ITAD] Lookup result:", data);

      if (!data.found) return null;
      return data.game?.id || null;
    } catch (e) {
      console.warn("ITAD lookup failed:", e.message);
      return null;
    }
  },

  async getPrices(gameId) {
    try {
      const url = `${this.BASE_URL}/games/prices/v2?key=${this.API_KEY}&country=GB&nondeals=true`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([gameId])
      });

      if (!response.ok) return [];

      const data = await response.json();

      if (!data || data.length === 0 || !data[0].deals) return [];

      return data[0].deals.map(deal => ({
        store: deal.shop.name,
        storeId: deal.shop.id.toString(),
        price: deal.price.amount,
        originalPrice: deal.regular.amount,
        currency: deal.price.currency,
        discount: deal.cut,
        dealUrl: deal.url,
        isSteam: deal.shop.name.toLowerCase() === "steam",
        historyLow: deal.historyLow?.amount || null,
        storeLow: deal.storeLow?.amount || null
      }));
    } catch (e) {
      console.warn("ITAD prices failed:", e.message);
      return [];
    }
  },

  async getDealsForSteamApp(appId, title) {
    // Try lookup by app ID first
    let gameId = await this.getGameByAppId(appId);

    // Fall back to title search
    if (!gameId) {
      const searchResult = await this.searchGame(title);
      if (searchResult) {
        gameId = searchResult.id;
      }
    }

    if (!gameId) return [];

    const deals = await this.getPrices(gameId);
    return deals;
  }
};