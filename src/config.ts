import "dotenv/config";

export interface Config {
    botConfig: Record<string, string>;
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
    const botType = (process.env["BOT_TYPE"] || "discord").toLowerCase();

    // Validate based on selected bot type
    if (botType === "discord") {
        requireEnv("DISCORD_TOKEN");
        requireEnv("DISCORD_CHANNEL_ID");
    } else if (botType === "matrix") {
        requireEnv("MATRIX_HOMESERVER_URL");
        requireEnv("MATRIX_ACCESS_TOKEN");
        requireEnv("MATRIX_ROOM_ID");
    } else {
        throw new Error(`Unknown BOT_TYPE: ${botType}. Please use 'discord' or 'matrix'.`);
    }

    return {
        botConfig: process.env as Record<string, string>,
        obsidianApiKey: requireEnv("OBSIDIAN_API_KEY"),
        obsidianApiUrl: requireValidUrl(process.env["OBSIDIAN_API_URL"] ?? "http://127.0.0.1:27123/"),
        destinationFolder: process.env["DESTINATION_FOLDER"] ?? "Clippings/",
    };
}
