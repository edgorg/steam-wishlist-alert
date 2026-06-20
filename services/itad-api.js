const ITAD_API = {
  BASE_URL: "https://api.isthereanydeal.com",
  API_KEY: CONFIG.ITAD_KEY,

  async searchGame(title) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/games/search/v1?key=${this.API_KEY}&title=${encodeURIComponent(title)}`
      );
      if (!response.ok) return null;

      const results = await response.json();
      return results?.[0] || null;
    } catch (e) {
      return null;
    }
  },

  async getGameByAppId(appId) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/games/lookup/v1?key=${this.API_KEY}&appid=${appId}`
      );
      if (!response.ok) return null;

      const data = await response.json();
      return data.found ? data.game?.id || null : null;
    } catch (e) {
      return null;
    }
  },

  async getPrices(gameId) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/games/prices/v2?key=${this.API_KEY}&country=GB&nondeals=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([gameId])
        }
      );
      if (!response.ok) return [];

      const data = await response.json();
      if (!data?.[0]?.deals) return [];

      return data[0].deals.map(deal => ({
        store: deal.shop.name,
        storeId: deal.shop.id.toString(),
        price: deal.price.amount,
        originalPrice: deal.regular.amount,
        currency: deal.price.currency,
        discount: deal.cut,
        dealUrl: deal.url,
        isSteam: deal.shop.name.toLowerCase() === "steam",
        historyLow: deal.historyLow?.amount ?? null,
        storeLow: deal.storeLow?.amount ?? null
      }));
    } catch (e) {
      return [];
    }
  },

  async getDealsForSteamApp(appId, title) {
    let gameId = await this.getGameByAppId(appId);

    if (!gameId) {
      const searchResult = await this.searchGame(title);
      if (searchResult) gameId = searchResult.id;
    }

    if (!gameId) return [];
    return this.getPrices(gameId);
  }
};