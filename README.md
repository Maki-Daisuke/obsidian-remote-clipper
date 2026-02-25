# Obsidian Remote Clipper

Clip web content anywhere to your Obsidian Vault via Discord, formatting into perfect Markdown using the official extraction engine.

https://github.com/user-attachments/assets/bb267530-76a0-4ced-beea-76e23c5c5478

## Overview

While the official Obsidian Clipper is fantastic for desktop browsing, clipping content from mobile often involves clunky "Share to..." menus or manual copy-pasting. This system automates the bridge:

1. **Share** a URL to a dedicated Discord channel on your phone.
2. **Process** the URL on your PC using a headless browser (Playwright) and the official Obsidian extraction engine (`defuddle`).
3. **Sync** the beautifully formatted Markdown directly into your Vault via a Local REST API.

### ✨ Key Benefits

* **Asynchronous Queue**: Your PC doesn't need to be always on! Share URLs to Discord anytime, and the bot will cleanly process the backlog the next time you boot up.
* **Instant Status**: The bot reacts to your Discord messages (✅/⚠️/❌) so you can confirm on your phone whether the page was successfully saved to your Vault.

## Prerequisites

Before setting up the bot, ensure you have the following configured:

### 1. System Environment

* **Node.js**: **Version 24.x (LTS) or higher**.
* **Package Manager**: **[pnpm](https://pnpm.io/)** (Recommended).
  * To enable pnpm on Node 24, run: `corepack enable pnpm`
* **Language**: **TypeScript**.
* **Playwright Browsers**: Required for rendering JavaScript-heavy sites.

### 2. Discord Side

* **Discord Developer Account**: [Discord Developer Portal](https://discord.com/developers/applications).
* **Bot Token**: Create a Bot in the Developer Portal.
* **Bot Configuration** (Developer Portal → Bot Settings):
  * ✅ **`MESSAGE CONTENT INTENT`** must be toggled ON (this is a Privileged Intent and must be manually enabled).
* **Channel ID**: A specific channel where the bot will listen for URLs.
* **Required Bot Permissions**:
  * `Read Message History` — Read past messages in the channel
  * `Send Messages` — Reply with status or error messages
  * `View Channels` — Access the monitored channel
  * `Add Reactions` — Notify processing status via reactions (✅/❌)

* If a single message contains **multiple URLs**, each is clipped individually.
* Non-URL text in the message is ignored.

### 3. Obsidian Side

* **Local REST API Plugin**:
  1. Install [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) from Community Plugins.
  2. Enable the plugin and obtain your **API Key**.
  3. ⚠️ **Obsidian must be running on your desktop** (Local REST API runs within the Obsidian process).

## Getting Started

### 1. Installation

```bash
# Enable pnpm via Node 24 Corepack
corepack enable pnpm

# Clone and install dependencies
git clone https://github.com/yourusername/discord-obsidian-clipper.git
cd discord-obsidian-clipper
pnpm install

# Install Playwright browser binaries
pnpx playwright install chromium
```

### 2. Configuration

Create a `.env` file in the root directory:

```env
OBSIDIAN_API_URL=http://127.0.0.1:27123/
OBSIDIAN_API_KEY=your_local_rest_api_key
DESTINATION_FOLDER=Clippings/
DISCORD_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=your_channel_id
```

### 3. Running the Bot

```bash
# Development mode
pnpm run dev

# Build and Start
pnpm run build
pnpm start
```

## Architecture & Design

For deep technical specifications and architectural decisions, please refer to the [System Design Document](doc/design.md).

## License

This project is licensed under the [MIT License](LICENSE).

## Author

Daisuke (yet another) Maki ([GitHub](https://github.com/Maki-Daisuke))
