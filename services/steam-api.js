const SteamAPI = {
  STORE_URL: "https://store.steampowered.com",

  async getRegion() {
    const data = await chrome.storage.local.get(["region"]);
    return data.region || "gb";
  },

  async searchGame(query) {
    try {
      const encoded = encodeURIComponent(query);
      const cc = await this.getRegion();
      const response = await fetch(
        `${this.STORE_URL}/api/storesearch/?term=${encoded}&l=english&cc=${cc}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data.items || []).map(item => ({
        appId: item.id,
        name: item.name,
        capsuleUrl: item.tiny_image || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`
      }));
    } catch (e) {
      console.warn("Steam search failed:", e.message);
      return [];
    }
  },

  async getAppDetails(appId, cc = null) {
    try {
      let url = `${this.STORE_URL}/api/appdetails?appids=${appId}`;
      if (cc) url += `&cc=${cc}`;

      const response = await fetch(url);

      if (!response.ok) return null;

      const data = await response.json();
      const appData = data[appId.toString()];

      if (!appData?.success || !appData.data) return null;

      const details = appData.data;
      const priceOverview = details.price_overview;

      return {
        appId: appId,
        name: details.name,
        capsuleUrl: details.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
        storeUrl: `https://store.steampowered.com/app/${appId}`,
        isFree: details.is_free || false,
        releaseDate: details.release_date?.date || null,
        released: !details.release_date?.coming_soon,
        currentPrice: priceOverview ? priceOverview.final / 100 : 0,
        originalPrice: priceOverview ? priceOverview.initial / 100 : 0,
        discountPercent: priceOverview ? priceOverview.discount_percent : 0,
        currency: priceOverview?.currency || "GBP"
      };
    } catch (e) {
      console.warn(`App details failed for ${appId}:`, e.message);
      return null;
    }
  }
};