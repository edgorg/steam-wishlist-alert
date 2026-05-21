# Steam Wishlist Alerts

A Chrome extension that tracks prices on your Steam wishlist and notifies you when games go on sale or hit your target price.

## Features

- **Import from Steam Wishlist** - visit your wishlist page and import with one click
- **Manual search** - search and add any Steam game individually
- **Price targets** - set a target price for each game, get notified when hit
- **Background price checking** - automatically checks prices every 2 hours
- **Browser notifications** - alerts you when prices drop or targets are hit
- **Deal highlighting** - games on sale sorted by biggest discount
- **Region support** - select your Steam region for accurate local pricing
- **Dark/light theme** - matches your preference
- **Notification controls** - toggle alerts on or off

## Installation

### From source (Developer mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/edgoran/steam-wishlist-alerts.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **"Load unpacked"**

5. Select the `steam-wishlist-alerts` folder

### From Chrome Web Store

_Coming soon_

## Usage

### Import Your Wishlist

1. Click the extension icon
2. Click **"Open Steam Wishlist to Import"** (or navigate there yourself)
3. On your wishlist page, a toast will appear in the bottom-right corner
4. Click **"Import"** to add all wishlisted games

### Add Games Manually

1. Click the extension icon
2. Type a game name in the search bar
3. Click on a result to add it

### Set Price Targets

1. Click the extension icon
2. Find a game in your list
3. Enter your target price in the input field
4. You'll be notified when the price drops to or below your target

### Settings

Click the gear icon to access:
- **Theme** - Dark, Light, or System
- **Notifications** - On or Off
- **Region** - Select your Steam store region

## How It Works

```text
Extension Popup
    |
    +-- Search: Steam Store Search API
    +-- Prices: Steam App Details API
    +-- Storage: chrome.storage.local
    |
Content Script (wishlist page only)
    |
    +-- Reads game IDs from page data
    +-- Shows import toast
    |
Background Service Worker
    |
    +-- Checks prices every 2 hours
    +-- Sends browser notifications on drops
    +-- Updates badge count for active deals
```

## Project Structure

```text
steam-wishlist-alerts/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   └── wishlist-importer.js
├── services/
│   └── steam-api.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .gitignore
└── README.md
```

## Technical Details

| Feature | Implementation |
|---------|---------------|
| Price fetching | Steam App Details API (no key required) |
| Wishlist import | Content script parsing page embedded data |
| Background checks | Chrome Alarms API (2 hour interval) |
| Notifications | Chrome Notifications API |
| Storage | chrome.storage.local |
| Theme | CSS custom properties with data-theme attribute |

## Permissions

| Permission | Reason |
|------------|--------|
| `storage` | Save tracked games, targets, and settings |
| `alarms` | Schedule background price checks |
| `notifications` | Alert user of price drops |
| `activeTab` | Detect when user is on wishlist page |
| `tabs` | Query current tab for import button |
| `host_permissions: store.steampowered.com` | Fetch game prices and details |
| `host_permissions: steamcommunity.com` | Resolve Steam profile IDs |
| `host_permissions: cdn.akamai.steamstatic.com` | Load game images |

## Privacy

- No data is collected or transmitted to any server
- All data (tracked games, targets, settings) is stored locally in your browser
- The extension only communicates with Steam's public APIs
- No analytics, tracking, or third-party services

## Known Limitations

- Wishlist import requires visiting the Steam wishlist page (no API access without a key)
- Price checks occur every 2 hours (Chrome limits alarm frequency)
- Some games may not have pricing info (unreleased, delisted, or free-to-play)
- Regional pricing depends on Steam's response to the selected country code