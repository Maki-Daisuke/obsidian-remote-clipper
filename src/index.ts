import { loadConfig } from "./config.js";
import { Clipper } from "./clipper.js";
import { createBot } from "./bot-factory.js";

async function main(): Promise<void> {
    console.log("🚀 Obsidian Remote Clipper starting...");

    const config = loadConfig();

    const clipper = new Clipper(config);
    const bot = await createBot(
        (url) => clipper.clipAndSave(url),
        config.botConfig
    );

    console.log("System is online. Listening for links...");

    // Explicitly close the browser/bot on shutdown; relying on implicit disposal
    // can leave the real (headed) browser process orphaned if the process is killed abruptly.
    let shuttingDown = false;
    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`Received ${signal}. Shutting down...`);
        try {
            await bot[Symbol.asyncDispose]();
            await clipper[Symbol.asyncDispose]();
        } catch (error) {
            console.error("Error during shutdown:", error);
        } finally {
            process.exit(0);
        }
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
