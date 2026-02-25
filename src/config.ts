import "dotenv/config";

export interface Config {
    discordToken: string;
    discordChannelId: string;
    obsidianApiKey: string;
    obsidianApiUrl: string;
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

function requireValidUrl(urlStr: string): string {
    try {
        new URL(urlStr);
        return urlStr.endsWith("/") ? urlStr : `${urlStr}/`;
    } catch {
        throw new Error(`Invalid URL provided for OBSIDIAN_API_URL: ${urlStr}`);
    }
}

export function loadConfig(): Config {
    return {
        discordToken: requireEnv("DISCORD_TOKEN"),
        discordChannelId: requireEnv("DISCORD_CHANNEL_ID"),
        obsidianApiKey: requireEnv("OBSIDIAN_API_KEY"),
        obsidianApiUrl: requireValidUrl(process.env["OBSIDIAN_API_URL"] ?? "http://127.0.0.1:27123/"),
        destinationFolder: process.env["DESTINATION_FOLDER"] ?? "Clippings/",
    };
}
