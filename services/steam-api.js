const SteamAPI = {
  STORE_URL: "https://store.steampowered.com",

  // ============================================================
  // Search for a game on Steam store
  // ============================================================
  async searchGame(query) {
    try {
      const encoded = encodeURIComponent(query);
      const response = await fetch(
        `${this.STORE_URL}/api/storesearch/?term=${encoded}&l=english&cc=gb`
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

  // ============================================================
  // Get app details (price, name, images)
  // ============================================================
  async getAppDetails(appId) {
    try {
      const response = await fetch(
        `${this.STORE_URL}/api/appdetails?appids=${appId}&cc=gb`
      );

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
  },

  // ============================================================
  // Get details for multiple apps
  // ============================================================
  async getMultipleAppDetails(appIds, onProgress) {
    const results = {};
    let completed = 0;

    for (const appId of appIds) {
      const details = await this.getAppDetails(appId);
      if (details) {
        results[appId] = details;
      }

      completed++;
      if (onProgress) onProgress(completed, appIds.length);

      // Rate limiting
      await new Promise(r => setTimeout(r, 250));
    }

    return results;
  }
};