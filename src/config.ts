import "dotenv/config";

export interface Config {
    discordToken: string;
    discordChannelId: string;
    obsidianApiKey: string;
    obsidianPort: number;
    destinationFolder: string;
}

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${key}. ` +
            `Copy .env.example to .env and fill in the values.`
        );
    }
    return value;
}

export function loadConfig(): Config {
    return {
        discordToken: requireEnv("DISCORD_TOKEN"),
        discordChannelId: requireEnv("DISCORD_CHANNEL_ID"),
        obsidianApiKey: requireEnv("OBSIDIAN_API_KEY"),
        obsidianPort: Number(process.env["OBSIDIAN_PORT"] ?? "27124"),
        destinationFolder: process.env["DESTINATION_FOLDER"] ?? "Clippings/",
    };
}
