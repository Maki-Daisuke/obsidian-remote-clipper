import {
    Client,
    Events,
    GatewayIntentBits,
    type Message,
    type TextChannel,
} from "discord.js";
import type { Config } from "./config.js";
import { clipUrl, buildMarkdownDocument } from "./clipper.js";
import { buildFilename } from "./filename.js";
import { isObsidianAvailable, saveToVault } from "./obsidian.js";

const URL_REGEX = /https?:\/\/[^\s<>]+/gi;

/** Reaction emojis used to track processing status. */
const REACTION = {
    success: "✅",
    warning: "⚠️",
    error: "❌",
    processing: "⏳",
} as const;

/** All bot reactions used for detecting unprocessed messages. */
const BOT_REACTIONS = [
    REACTION.success,
    REACTION.warning,
    REACTION.error,
] as const;

/**
 * Extract all URLs from a Discord message's text content.
 */
function extractUrls(content: string): string[] {
    return content.match(URL_REGEX) ?? [];
}

/**
 * Process a single URL: clip it, generate a filename, and save to vault.
 *
 * @returns "success" | "warning" | "error" indicating the outcome
 */
async function processUrl(
    url: string,
    config: Config,
): Promise<"success" | "warning" | "error"> {
    // Check Obsidian availability before clipping
    const available = await isObsidianAvailable(config);
    if (!available) {
        return "error";
    }

    const clip = await clipUrl(url);
    const filename = buildFilename(clip.title, url);
    const filePath = `${config.destinationFolder}${filename}`;
    const markdown = buildMarkdownDocument(clip);

    await saveToVault(filePath, markdown, config);

    return clip.isError ? "warning" : "success";
}

/**
 * Process a Discord message: extract URLs, clip each, and react accordingly.
 */
async function processMessage(
    message: Message,
    config: Config,
): Promise<void> {
    const urls = extractUrls(message.content);
    if (urls.length === 0) return;

    // Add processing indicator
    await message.react(REACTION.processing).catch(() => { });

    let hasError = false;
    let hasWarning = false;

    for (const url of urls) {
        try {
            const result = await processUrl(url, config);

            if (result === "error") {
                hasError = true;
                break; // Obsidian is unavailable, stop processing this message
            }
            if (result === "warning") {
                hasWarning = true;
            }
        } catch (error) {
            console.error(`Error processing URL ${url}:`, error);
            hasError = true;
        }
    }

    // Remove processing indicator
    await message.reactions.cache
        .get(REACTION.processing)
        ?.users.remove(message.client.user?.id)
        .catch(() => { });

    // Add final status reaction
    if (hasError) {
        await message.react(REACTION.error).catch(() => { });
        await message
            .reply(
                `❌ Could not save to Obsidian. Is Obsidian running with Local REST API enabled?`
            )
            .catch(() => { });
    } else if (hasWarning) {
        await message.react(REACTION.warning).catch(() => { });
    } else {
        await message.react(REACTION.success).catch(() => { });
    }
}

/**
 * Check if a message has already been processed by the bot.
 * A message is considered processed if it has any of the bot's status reactions.
 */
function isProcessedByBot(message: Message, botUserId: string): boolean {
    return BOT_REACTIONS.some((emoji) => {
        const reaction = message.reactions.cache.get(emoji);
        return reaction?.users.cache.has(botUserId) ?? false;
    });
}

/**
 * Scan recent messages in the monitored channel for unprocessed URLs.
 * Called on bot startup to recover from offline periods.
 */
async function recoverUnprocessedMessages(
    channel: TextChannel,
    config: Config,
    botUserId: string,
): Promise<void> {
    console.log("Scanning for unprocessed messages...");

    // Fetch last 100 messages (Discord API limit per request)
    const messages = await channel.messages.fetch({ limit: 100 });

    // Filter to unprocessed messages that contain URLs
    const unprocessed = messages.filter((message) => {
        if (message.author.bot) return false;
        if (isProcessedByBot(message, botUserId)) return false;
        const urls = extractUrls(message.content);
        return urls.length > 0;
    });

    if (unprocessed.size === 0) {
        console.log("No unprocessed messages found.");
        return;
    }

    console.log(`Found ${unprocessed.size} unprocessed message(s). Processing...`);

    // Process oldest first (reverse chronological order from fetch)
    const sorted = [...unprocessed.values()].reverse();
    for (const message of sorted) {
        await processMessage(message, config);
    }

    console.log("Unprocessed message recovery complete.");
}

/**
 * Create and start the Discord bot.
 *
 * @param config - Application configuration
 * @returns The initialized Discord client
 */
export function createBot(config: Config): Client {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions,
        ],
    });

    client.once(Events.ClientReady, async (readyClient) => {
        console.log(`Bot logged in as ${readyClient.user.tag}`);

        // Recover unprocessed messages from the monitored channel
        try {
            const channel = await readyClient.channels.fetch(config.discordChannelId);
            if (channel?.isTextBased()) {
                await recoverUnprocessedMessages(
                    channel as TextChannel,
                    config,
                    readyClient.user.id,
                );
            } else {
                console.error(
                    `Channel ${config.discordChannelId} is not a text channel.`
                );
            }
        } catch (error) {
            console.error("Failed to recover unprocessed messages:", error);
        }
    });

    client.on(Events.MessageCreate, async (message) => {
        // Ignore bot messages and messages from other channels
        if (message.author.bot) return;
        if (message.channelId !== config.discordChannelId) return;

        await processMessage(message, config);
    });

    return client;
}
