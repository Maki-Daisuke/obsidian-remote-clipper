import "dotenv/config";
import { launchClipperContext } from "../src/browser.js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const userDataDir = process.env["CHROME_USER_DATA_DIR"];
if (!userDataDir) {
    console.error(
        "CHROME_USER_DATA_DIR is not set. Set it in .env first so the saved login profile matches the one the clipper (pnpm start) uses.",
    );
    process.exit(1);
}

console.log(`Opening Chrome with dedicated profile: ${userDataDir}`);
console.log("Please log in manually in the opened window, then press Enter here.");

const context = await launchClipperContext(userDataDir, false);

const page = context.pages()[0] ?? await context.newPage();
await page.goto("https://www.google.com");

const rl = readline.createInterface({ input, output });
await rl.question("Login completed? Press Enter to save and exit... ");
rl.close();

await context.close();
console.log("✅ Login session saved to the profile directory.");
