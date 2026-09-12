import { chromium, type BrowserContext } from "playwright";

/**
 * Launches a persistent Chromium context with the settings shared by the login helper and the clipper:
 * - Windows uses Edge to avoid the chrome-headless-shell DOS window; other platforms use bundled Chromium.
 * - Automation signals are hidden so login providers (e.g. Google) don't reject sign-in.
 */
export function launchClipperContext(userDataDir: string, headless: boolean): Promise<BrowserContext> {
    return chromium.launchPersistentContext(userDataDir, {
        headless,
        channel: process.platform === "win32" ? "msedge" : undefined,
        ignoreDefaultArgs: ["--enable-automation"],
        args: ["--disable-blink-features=AutomationControlled"],
    });
}
