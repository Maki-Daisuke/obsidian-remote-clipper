# Obsidian Remote Clipper

Clip web content anywhere to your Obsidian Vault via Discord or Matrix, formatting into perfect Markdown using the official extraction engine.

<https://github.com/user-attachments/assets/bb267530-76a0-4ced-beea-76e23c5c5478>

## Overview

<img width="1024" height="574" alt="System Overview" src="https://github.com/user-attachments/assets/7f2a2da8-d83d-4960-81af-6aa5371a712a" />

While the official Obsidian Clipper is fantastic for desktop browsing, clipping content from mobile often involves clunky "Share to..." menus or manual copy-pasting. This system automates the bridge:

1. **Share** a URL to a dedicated chat channel (Discord or Matrix) on your phone.
2. **Process** the URL on your PC using a headless browser (Playwright) and the official Obsidian extraction engine (`defuddle`).
3. **Sync** the beautifully formatted Markdown directly into your Vault via a Local REST API.

### ✨ Key Benefits

* **Asynchronous Queue**: Your PC doesn't need to be always on! Share URLs to your chat app anytime, and the bot will cleanly process the backlog the next time you boot up.
* **Instant Status**: The bot reacts to your messages (✅/⚠️/❌) so you can confirm on your phone whether the page was successfully saved to your Vault.

## Prerequisites

Before setting up the bot, ensure you have the following configured:

### 1. System Environment

* **Node.js**: **Version 24.x (LTS) or higher**.
* **Package Manager**: **[pnpm](https://pnpm.io/)** (Recommended).
  * To enable pnpm on Node 24, run: `corepack enable pnpm`
* **Language**: **TypeScript**.
* **Playwright Browsers**: Required for rendering JavaScript-heavy sites.

### 2. Chat Platform Configuration (Choose Discord OR Matrix)

#### Option A: Discord

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

#### Option B: Matrix (e.g., Element)

* **Matrix Account**: A dedicated account for the bot (or your own, though a dedicated bot account is recommended).
* **Access Token**: You need the access token for the bot account. We provide a helper script to generate this:
  `pnpm tsx misc/get_matrix_access_token.ts`
* **Room ID**: The internal ID of the room to monitor (e.g., `!yourRoomId:matrix.org`).
* **E2E Encryption**: The bot natively supports and decrypts messages in End-to-End Encrypted rooms!

*(For both platforms: If a single message contains **multiple URLs**, each is clipped individually. Non-URL text is ignored).*

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

# Choose which bot backend to run: 'discord' or 'matrix'
BOT_TYPE=discord

# --- IF USING DISCORD ---
DISCORD_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=your_channel_id

# --- IF USING MATRIX ---
MATRIX_HOMESERVER_URL=https://matrix.org
MATRIX_ACCESS_TOKEN=your_matrix_access_token
MATRIX_ROOM_ID=!your_room_id:matrix.org
```

> **Note on Matrix Tokens**: You can easily obtain your Matrix access token by running `pnpm tsx misc/get_matrix_access_token.ts` and entering the bot's credentials in your terminal.

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
