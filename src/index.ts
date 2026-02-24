import { loadConfig } from "./config.js";
import { createBot } from "./bot.js";
import { closeBrowser } from "./clipper.js";

async function main(): Promise<void> {
    console.log("🚀 Discord-to-Obsidian Web Clipper starting...");

    const config = loadConfig();
    const client = createBot(config);

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);

        client.destroy();
        await closeBrowser();

        console.log("Goodbye!");
        process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    await client.login(config.discordToken);
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
