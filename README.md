# Steam Wishlist Alerts

A Chrome extension that tracks Steam game prices and notifies you when they drop or hit your target price. Compare prices across multiple stores with one click.

## Features

### Free
- Track up to 5 games
- Import from your Steam Wishlist page
- Quick-add button on Steam store pages
- Set target prices for each game
- Background price checking (every 2 hours)
- Browser notifications on price drops
- Sort by name, price, discount, or date added
- Steam sale countdown
- Dark/light theme
- Region selection for accurate local pricing

### Premium
- Unlimited game tracking
- Price comparison across 30+ stores (via IsThereAnyDeal)
- Deal score (shows how close to all-time low)
- Support the developer

## Screenshots

_Add screenshots here_

## Installation

### From Chrome Web Store

_Coming soon_

### From source (Developer mode)

1. Clone this repository:

```text
git clone https://github.com/edgoran/steam-wishlist-alerts.git
```

2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `steam-wishlist-alerts` folder

## Usage

### Adding Games

**Method 1: Search**
1. Click the extension icon
2. Type a game name in the search bar
3. Click a result to add it

**Method 2: Import from Wishlist**
1. Visit your Steam Wishlist page
2. A notification appears in the bottom-right
3. Click "Import" to add all wishlisted games

**Method 3: Quick-Add (on Steam store pages)**
1. Browse to any game on the Steam store
2. Click the "Track Price" button that appears above the purchase area

### Price Targets

1. Click the extension icon
2. Enter a target price in the input next to any game
3. You'll be notified when the price drops to or below your target

### Price Comparison (Premium)

1. Click the tag icon next to any game
2. A modal shows prices across 30+ stores
3. Click any store to go directly to their page

### Settings

Click the gear icon to access:
- **Theme** - Dark, Light, or System
- **Notifications** - On or Off
- **Region** - Select your Steam store region
- **Sort** - Order your watched games
- **Premium** - Activate your licence key

## How It Works

```text
Extension Popup
    |
    +-- Search: Steam Store Search API
    +-- Prices: Steam App Details API
    +-- Comparison: IsThereAnyDeal API (Premium)
    +-- Storage: chrome.storage.local + sync
    |
Content Scripts
    |
    +-- Wishlist page: Import game IDs from page data
    +-- Store pages: Quick-add "Track Price" button
    +-- Compare modal: Full-page overlay for price comparison
    |
Background Service Worker
    |
    +-- Checks prices every 2 hours
    +-- Sends browser notifications on drops
    +-- Updates deal scores (Premium)
    +-- Badge count for active deals
```

## Project Structure

```text
steam-wishlist-alerts/
|-- manifest.json
|-- background/
|   +-- service-worker.js
|-- content/
|   |-- wishlist-importer.js
|   |-- steam-quick-add.js
|   +-- compare-modal.js
|-- services/
|   |-- config.js (gitignored)
|   |-- steam-api.js
|   |-- itad-api.js
|   +-- licence-service.js
|-- popup/
|   |-- popup.html
|   |-- popup.css
|   +-- popup.js
|-- icons/
|   |-- icon16.png
|   |-- icon48.png
|   +-- icon128.png
|-- .gitignore
+-- README.md
```

## Permissions

| Permission | Reason |
|------------|--------|
| storage | Save tracked games, targets, settings, and licence key |
| alarms | Schedule background price checks |
| notifications | Alert user of price drops |
| activeTab | Detect when user is on wishlist page |
| tabs | Query current tab for import/compare features |
| scripting | Inject compare modal into active page |
| host_permissions | Fetch prices from Steam, ITAD, and LemonSqueezy APIs |

## Privacy

- No personal data is collected or transmitted to external servers
- Game tracking data is stored locally in your browser
- Licence keys are stored in Chrome sync storage (encrypted by Chrome)
- The extension communicates only with:
  - Steam (game prices and search)
  - IsThereAnyDeal (price comparison, premium only)
  - LemonSqueezy (licence validation, premium only)
- No analytics, tracking, or advertising

## Technical Details

| Feature | Implementation |
|---------|---------------|
| Price fetching | Steam App Details API |
| Wishlist import | Content script parsing embedded page data |
| Quick-add | Content script on Steam store pages |
| Price comparison | IsThereAnyDeal API (POST v2) |
| Background checks | Chrome Alarms API |
| Notifications | Chrome Notifications API |
| Licence management | LemonSqueezy API + chrome.storage.sync |
| Theme | CSS custom properties with data-theme attribute |

## Known Limitations

- Wishlist import requires visiting the Steam wishlist page
- Price checks occur every 2 hours (Chrome limits alarm frequency)
- Some games may not have pricing info (unreleased, delisted, free-to-play)
- Deal score requires Premium (uses IsThereAnyDeal data)
- Compare modal cannot be shown on chrome:// pages
- Sale countdown dates are estimates based on historical patterns
