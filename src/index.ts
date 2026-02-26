import { loadConfig } from "./config.js";
import { Clipper } from "./clipper.js";
import { createBot } from "./bot-factory.js";

async function main(): Promise<void> {
    console.log("🚀 Obsidian Remote Clipper starting...");

    const config = loadConfig();

    await using clipper = new Clipper(config);
    await using bot = await createBot(
        (url) => clipper.clipAndSave(url),
        config.botConfig
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
