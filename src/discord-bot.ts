import type { Bot, ProcessResult } from "./types.js";
import {
    Client,
    Events,
    GatewayIntentBits,
    type Message,
    type TextChannel,
} from "discord.js";

const URL_REGEX = /https?:\/\/[^\s<>]+/gi;

const REACTION = {
    success: "✅",
    warning: "⚠️",
    error: "❌",
    processing: "⏳",
} as const;

const BOT_REACTIONS = [
    REACTION.success,
    REACTION.warning,
    REACTION.error,
] as const;

/**
 * Discord-specific implementation of the Bot interface.
 */
export class DiscordBot implements Bot {
    private client: Client;
    private channelId: string;
    private processURL: (url: string) => Promise<ProcessResult>;

    private constructor(
        processURL: (url: string) => Promise<ProcessResult>,
        conf: { token: string; channelId: string }
    ) {
        this.processURL = processURL;
        this.channelId = conf.channelId;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions,
            ],
        });
    }

    /**
     * Factory function to create and initialize a Discord Bot.
     *
     * @param processURL - Async function to handle discovered URLs
     * @param conf - Configuration containing token and channel ID
     */
    static create(
        processURL: (url: string) => Promise<ProcessResult>,
        conf: { token: string; channelId: string },
    ): Promise<DiscordBot> {
        const bot = new DiscordBot(processURL, conf);
        return new Promise((resolve, reject) => {
            bot.client.once(Events.ClientReady, async (readyClient) => {
                console.log(`Bot logged in as ${readyClient.user.tag}`);
                try {
                    const channel = await readyClient.channels.fetch(bot.channelId);
                    if (channel?.isTextBased()) {
                        await bot.recoverUnprocessedMessages(
                            channel as TextChannel,
                            readyClient.user.id
                        );
                    }
                    resolve(bot);
                } catch (error) {
                    reject(error);
                }
            });

            bot.client.on(Events.MessageCreate, async (message) => {
                if (message.author.bot) return;
                if (message.channelId !== bot.channelId) return;
                await bot.handleMessage(message);
            });

            bot.client.login(bot.client.token || undefined).catch(reject);
        });
    }

    /**
     * Start the bot login process.
     * @param token - Discord bot token
     */
    async login(token: string): Promise<void> {
        await this.client.login(token);
    }

    private extractUrls(content: string): string[] {
        return content.match(URL_REGEX) ?? [];
    }

    private async handleMessage(message: Message): Promise<void> {
        const urls = this.extractUrls(message.content);
        if (urls.length === 0) return;

        await message.react(REACTION.processing).catch(() => { });

        let hasError = false;
        let hasWarning = false;

        for (const url of urls) {
            try {
                const result = await this.processURL(url);

                if (result === "error") {
                    hasError = true;
                    break;
                }
                if (result === "warning") {
                    hasWarning = true;
                }
            } catch (error) {
                console.error(`Error processing URL ${url}:`, error);
                hasError = true;
            }
        }

        await message.reactions.cache
            .get(REACTION.processing)
            ?.users.remove(this.client.user?.id)
            .catch(() => { });

        if (hasError) {
            await message.react(REACTION.error).catch(() => { });
            await message
                .reply(
                    `❌ Could not save to Obsidian. Please check if the service is running.`
                )
                .catch(() => { });
        } else if (hasWarning) {
            await message.react(REACTION.warning).catch(() => { });
        } else {
            await message.react(REACTION.success).catch(() => { });
        }
    }

    private isProcessedByBot(message: Message, botUserId: string): boolean {
        return BOT_REACTIONS.some((emoji) => {
            const reaction = message.reactions.cache.get(emoji);
            return reaction?.users.cache.has(botUserId) ?? false;
        });
    }

    private async recoverUnprocessedMessages(
        channel: TextChannel,
        botUserId: string,
    ): Promise<void> {
        console.log("Scanning for unprocessed messages...");
        const messages = await channel.messages.fetch({ limit: 100 });

        const unprocessed = messages.filter((message) => {
            if (message.author.bot) return false;
            if (this.isProcessedByBot(message, botUserId)) return false;
            return this.extractUrls(message.content).length > 0;
        });

        if (unprocessed.size === 0) {
            console.log("No unprocessed messages found.");
            return;
        }

        console.log(`Found ${unprocessed.size} unprocessed message(s). Processing...`);
        const sorted = [...unprocessed.values()].reverse();
        for (const message of sorted) {
            await this.handleMessage(message);
        }
        console.log("Recovery complete.");
    }

    async destroy(): Promise<void> {
        console.log("Destroying Discord bot...");
        await this.client.destroy();
    }

    async [Symbol.asyncDispose](): Promise<void> {
        await this.destroy();
    }
}
