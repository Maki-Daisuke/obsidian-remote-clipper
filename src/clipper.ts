import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { Defuddle } from "defuddle/node";
import { launchClipperContext } from "./browser.js";
import type { Config } from "./config.js";
import { buildFilename } from "./filename.js";
import { isObsidianAvailable, saveToVault } from "./obsidian.js";
import type { ProcessResult } from "./types.js";
import { AsyncLock } from "./lock.js";

export interface ClipResult {
    title: string;
    content: string;
    author?: string;
    description?: string;
    siteName?: string;
    published?: string;
    url: string;
    isError: boolean;
}

/**
 * Handles web clipping page rendering, extraction, and saving to Obsidian.
 */
export class Clipper implements AsyncDisposable {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private config: Config;
    private userDataDir?: string;

    private readonly lock = new AsyncLock();
    private idleTimer: NodeJS.Timeout | null = null;
    private activeClipsCount = 0;
    private isDisposed = false;

    constructor(config: Config) {
        this.config = config;
        this.userDataDir = process.env["CHROME_USER_DATA_DIR"];
    }

    /**
     * Clears any currently scheduled idle timer.
     */
    private clearIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    /**
     * Starts the idle timer if configured.
     * When it fires, if no clips are running, the browser will be closed.
     */
    private startIdleTimer(): void {
        this.clearIdleTimer();
        if (this.config.browserIdleTimeoutMs <= 0) {
            return;
        }

        this.idleTimer = setTimeout(() => {
            void this.handleIdleTimeout();
        }, this.config.browserIdleTimeoutMs);

        // Do not prevent Node.js from exiting purely because of this idle timer
        this.idleTimer.unref();
    }

    /**
     * Closes the browser when the idle timeout is reached, under the mutex lock.
     */
    private async handleIdleTimeout(): Promise<void> {
        await this.lock.runExclusive(async () => {
            // Re-check under the lock: do not close if new clips arrived or if disposed
            if (this.activeClipsCount > 0 || this.isDisposed) {
                return;
            }

            const timeoutSec = Math.round(this.config.browserIdleTimeoutMs / 1000);
            console.log(`Browser idle timeout reached (${timeoutSec}s). Closing browser to free memory...`);
            await this.closeBrowser();
        });
    }

    /**
     * Closes any running browser or persistent context instances.
     */
    private async closeBrowser(): Promise<void> {
        this.clearIdleTimer();
        try {
            if (this.context) {
                console.log("Closing Clipper browser context...");
                await this.context.close();
            } else if (this.browser) {
                console.log("Closing Clipper browser...");
                await this.browser.close();
            }
        } catch (error) {
            console.error("Error closing browser:", error);
        } finally {
            this.context = null;
            this.browser = null;
        }
    }

    /**
     * Atomically acquires a new page under the mutex lock.
     * Cancels any active idle timer, ensures the browser/context is running,
     * creates a new page, and increments the active clip count.
     */
    private async acquirePage(): Promise<Page> {
        return this.lock.runExclusive(async () => {
            if (this.isDisposed) {
                throw new Error("Clipper has been disposed");
            }

            this.clearIdleTimer();

            if (this.userDataDir) {
                if (!this.context) {
                    this.context = await launchClipperContext(this.userDataDir, true);
                }
                const page = await this.context.newPage();
                this.activeClipsCount++;
                return page;
            }

            if (!this.browser || !this.browser.isConnected()) {
                this.browser = await chromium.launch({
                    headless: true,
                });
            }
            const page = await this.browser.newPage();
            this.activeClipsCount++;
            return page;
        });
    }

    /**
     * Releases the page by closing it and updating the active clip count under the lock.
     * If no clips are active, arms the idle timer.
     */
    private async releasePage(page: Page): Promise<void> {
        try {
            await page.close();
        } catch (error) {
            console.warn("Failed to close page cleanly:", error);
        }

        await this.lock.runExclusive(async () => {
            this.activeClipsCount = Math.max(0, this.activeClipsCount - 1);
            if (this.activeClipsCount === 0 && !this.isDisposed) {
                this.startIdleTimer();
            }
        });
    }

    /**
     * Orchestrates the high-level process: check availability, clip, and save.
     * This corresponds to the former 'processURL' function.
     */
    async clipAndSave(url: string): Promise<ProcessResult> {
        // Check Obsidian availability before clipping
        const available = await isObsidianAvailable(this.config);
        if (!available) {
            return "error";
        }

        try {
            const clip = await this.clip(url);
            const filename = buildFilename(clip.title);
            const filePath = `${this.config.destinationFolder}${filename}`;
            const markdown = this.buildMarkdownDocument(clip);

            await saveToVault(filePath, markdown, this.config);

            return clip.isError ? "warning" : "success";
        } catch (error) {
            console.error(`Error during clipAndSave for ${url}:`, error);
            return "error";
        }
    }

    /**
     * Renders a URL with Playwright and extracts content with Defuddle.
     */
    async clip(url: string): Promise<ClipResult> {
        const page = await this.acquirePage();

        try {
            const response = await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 30000,
            });

            // Wait for JS-rendered content to appear
            await page.waitForTimeout(5000);

            // Use the final URL after all redirects
            const finalUrl = page.url();
            const statusCode = response?.status() ?? 0;

            if (!response || statusCode >= 400) {
                return {
                    title: `Error clipping: ${finalUrl}`,
                    content: `# Clip Error\n\n- **URL**: ${finalUrl}\n- **Status**: ${statusCode}\n- **Message**: The server returned an error response.\n`,
                    url: finalUrl,
                    isError: true,
                };
            }

            // Remove non-rendered elements before extraction. Some sites hide several
            // paywall/newsletter state messages via display:none, which otherwise trick Defuddle
            // into extracting that block instead of the visible article body.
            await page.evaluate(() => {
                type El = { remove(): void };
                const g = globalThis as unknown as {
                    document: { querySelectorAll(sel: string): Iterable<El> };
                    getComputedStyle(el: El): { display: string; visibility: string };
                };
                for (const el of Array.from(g.document.querySelectorAll("body *"))) {
                    const style = g.getComputedStyle(el);
                    if (style.display === "none" || style.visibility === "hidden") {
                        el.remove();
                    }
                }
            });

            const html = await page.content();
            const result = await Defuddle(html, finalUrl, { markdown: true });

            return {
                title: result.title || new URL(finalUrl).hostname,
                content: result.contentMarkdown || result.content || "",
                author: result.author || undefined,
                description: result.description || undefined,
                siteName: result.site || undefined,
                published: result.published || undefined,
                url: finalUrl,
                isError: false,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            return {
                title: `Error clipping: ${url}`,
                content: `# Clip Error\n\n- **URL**: ${url}\n- **Error**: ${errorMessage}\n`,
                url,
                isError: true,
            };
        } finally {
            await this.releasePage(page);
        }
    }

    /**
     * Builds the full internal Markdown document with frontmatter.
     */
    private buildMarkdownDocument(clip: ClipResult): string {
        const clippedAt = new Date().toISOString();
        const frontmatter = this.buildFrontmatter(clip, clippedAt);
        return `${frontmatter}\n\n${clip.content}\n`;
    }

    /**
     * Builds a YAML frontmatter string from clip metadata.
     */
    private buildFrontmatter(clip: ClipResult, clippedAt: string): string {
        const fields: string[] = [];

        fields.push(`title: ${JSON.stringify(clip.title)}`);
        fields.push(`source: ${JSON.stringify(clip.url)}`);

        if (clip.author) fields.push(`author: ${JSON.stringify(clip.author)}`);
        if (clip.description) fields.push(`description: ${JSON.stringify(clip.description)}`);
        if (clip.siteName) fields.push(`site: ${JSON.stringify(clip.siteName)}`);
        if (clip.published) fields.push(`published: ${JSON.stringify(clip.published)}`);

        fields.push(`clipped: ${JSON.stringify(clippedAt)}`);
        if (clip.isError) fields.push(`error: true`);

        return `---\n${fields.join("\n")}\n---`;
    }

    /**
     * Gracefully shuts down the browser instance on disposal under the lock.
     */
    async [Symbol.asyncDispose](): Promise<void> {
        await this.lock.runExclusive(async () => {
            this.isDisposed = true;
            this.clearIdleTimer();
            await this.closeBrowser();
        });
    }
}
