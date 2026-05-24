const LicenceService = {
  VALIDATE_URL: "https://api.lemonsqueezy.com/v1/licenses/validate",
  ACTIVATE_URL: "https://api.lemonsqueezy.com/v1/licenses/activate",

  async validateKey(licenceKey) {
    try {
      const response = await fetch(this.VALIDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: licenceKey,
          instance_name: "chrome-extension"
        })
      });

      if (!response.ok) return { valid: false, error: "Validation failed" };

      const data = await response.json();

      return {
        valid: data.valid,
        status: data.license_key?.status,
        email: data.meta?.customer_email || null,
        error: data.valid ? null : "Invalid licence key"
      };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  },

  async activateKey(licenceKey) {
    try {
      const response = await fetch(this.ACTIVATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: licenceKey,
          instance_name: "chrome-extension"
        })
      });

      if (!response.ok) return { success: false, error: "Activation failed" };

      const data = await response.json();

      return {
        success: data.activated,
        error: data.activated ? null : data.error || "Could not activate"
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async saveLicence(licenceKey) {
    await chrome.storage.sync.set({
      licenceKey: licenceKey,
      premiumValidated: Date.now()
    });

    await chrome.storage.local.set({
      premium: true,
      licenceKey: licenceKey,
      premiumValidated: Date.now()
    });
  },

  async removeLicence() {
    await chrome.storage.sync.remove(["licenceKey", "premiumValidated"]);
    await chrome.storage.local.set({ premium: false });
    await chrome.storage.local.remove(["licenceKey", "premiumValidated"]);
  },

  async checkPremiumStatus() {
    const local = await chrome.storage.local.get(["licenceKey", "premiumValidated"]);

    if (!local.licenceKey) {
      const synced = await chrome.storage.sync.get(["licenceKey", "premiumValidated"]);

      if (synced.licenceKey) {
        await chrome.storage.local.set({
          licenceKey: synced.licenceKey,
          premiumValidated: synced.premiumValidated,
          premium: true
        });
        return true;
      }

      return false;
    }

    const lastValidated = local.premiumValidated || 0;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (Date.now() - lastValidated < sevenDays) return true;

    const result = await this.validateKey(local.licenceKey);

    if (result.valid) {
      await chrome.storage.sync.set({ premiumValidated: Date.now() });
      await chrome.storage.local.set({ premiumValidated: Date.now() });
      return true;
    } else {
      await this.removeLicence();
      return false;
    }
  },

  getCheckoutUrl() {
    return `https://${CONFIG.LEMON_STORE_ID}.lemonsqueezy.com/checkout/buy/${CONFIG.LEMON_PRODUCT_ID}`;
  }
};