import type { Bot, ProcessResult } from "./types.js";
import { DiscordBot } from "./discord-bot.js";
import { MatrixBot } from "./matrix-bot.js";

/**
 * Creates and initializes a bot based on the provided configuration.
 *
 * @param processURL - Async callback to process URLs discovered by the bot.
 * @param conf - Key-value pair configuration, typically derived from environment variables.
 * @returns A Promise resolving to an initialized instance of a Bot.
 */
export async function createBot(
    processURL: (url: string) => Promise<ProcessResult>,
    conf: Record<string, string>,
): Promise<Bot> {
    const botType = conf["BOT_TYPE"]?.toLowerCase() || "discord";

    if (botType === "discord") {
        return await DiscordBot.create(processURL, {
            token: conf["DISCORD_TOKEN"] ?? "",
            channelId: conf["DISCORD_CHANNEL_ID"] ?? ""
        });
    } else if (botType === "matrix") {
        return await MatrixBot.create(processURL, conf);
    }

    throw new Error(`Unknown BOT_TYPE: ${botType}. Please use 'discord' or 'matrix'.`);
}
