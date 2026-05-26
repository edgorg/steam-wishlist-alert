# Privacy Policy - Steam Wishlist Alerts

## Data Collection

Steam Wishlist Alerts does not collect, transmit, or store any personal data on external servers.

## What Is Stored Locally

All data remains in your browser:
- Game IDs and names you choose to track
- Price targets you set
- Price data fetched from Steam's public API
- Your selected region and theme preferences
- Licence key (if Premium activated, stored in Chrome sync)

## External Connections

The extension communicates with:
- **store.steampowered.com** - game prices, search, and details
- **steamcommunity.com** - profile resolution for wishlist import
- **cdn.akamai.steamstatic.com** - game images
- **api.isthereanydeal.com** - price comparison across stores (Premium only)
- **api.lemonsqueezy.com** - licence key validation (Premium only)

No data is sent to any other server. No analytics or tracking services are used.

## Licence Key Storage

Premium licence keys are stored in Chrome's sync storage, which is:
- Encrypted by Chrome
- Synced across your Chrome browsers (if signed in)
- Not accessible to other extensions or websites
- Only transmitted to LemonSqueezy for periodic validation

## Chrome Permissions

| Permission | Purpose |
|------------|---------|
| storage | Save your tracked games and preferences locally |
| alarms | Schedule background price checks |
| notifications | Alert you when prices drop |
| activeTab | Detect Steam wishlist page for import |
| tabs | Query current tab for features |
| scripting | Show comparison overlay on pages |
| host_permissions | Fetch data from Steam, ITAD, LemonSqueezy |

## Data Retention

All data is stored indefinitely until you:
- Remove a game from tracking
- Clear all games
- Uninstall the extension
- Clear Chrome extension data manually

## Third-Party Services

- **Steam** - Valve Corporation's public APIs, subject to their privacy policy
- **IsThereAnyDeal** - Price comparison service, subject to their privacy policy
- **LemonSqueezy** - Payment processing, subject to their privacy policy

## Children's Privacy

This extension does not knowingly collect any information from children under 13.

## Contact

For questions about this privacy policy, open an issue at:
https://github.com/edgoran/steam-wishlist-alerts/issues

Last updated: 2026