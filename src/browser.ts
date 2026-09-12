import { chromium, type BrowserContext } from "playwright";

/**
 * Launches a persistent Chromium context with the settings shared by the login helper and the clipper.
 * Uses Playwright's bundled Chromium on every platform: measurements showed the msedge channel spawns a
 * lingering headless window/conhost on Windows, while bundled Chromium (chrome-headless-shell) does not.
 * Automation signals are hidden so login providers (e.g. Google) don't reject sign-in.
 */
export function launchClipperContext(userDataDir: string, headless: boolean): Promise<BrowserContext> {
    return chromium.launchPersistentContext(userDataDir, {
        headless,
        ignoreDefaultArgs: ["--enable-automation"],
        args: ["--disable-blink-features=AutomationControlled"],
    });
}
