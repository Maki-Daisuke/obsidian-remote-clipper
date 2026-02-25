import { loadConfig } from "./config.js";
import { DiscordBot } from "./discord-bot.js";
import { Clipper } from "./clipper.js";

async function main(): Promise<void> {
    console.log("🚀 Obsidian Remote Clipper starting...");

    const config = loadConfig();

    await using clipper = new Clipper(config);
    await using bot = await DiscordBot.create(
        (url) => clipper.clipAndSave(url),
        {
            token: config.discordToken,
            channelId: config.discordChannelId,
        }
    );

    console.log("System is online. Listening for links...");

    // Keep the process alive
    await new Promise((resolve) => {
        process.on("SIGINT", resolve);
        process.on("SIGTERM", resolve);
    });

    console.log("Shutting down...");
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
