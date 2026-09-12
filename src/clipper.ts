import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { Defuddle } from "defuddle/node";
import { launchClipperContext } from "./browser.js";
import type { Config } from "./config.js";
import { buildFilename } from "./filename.js";
import { isObsidianAvailable, saveToVault } from "./obsidian.js";
import type { ProcessResult } from "./types.js";

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

    constructor(config: Config) {
        this.config = config;
        this.userDataDir = process.env["CHROME_USER_DATA_DIR"];
    }

    /**
     * Opens a new page, launching the browser (or persistent context) on first use.
     * Uses a persistent context when CHROME_USER_DATA_DIR is set to reuse a logged-in session.
     */
    private async getPage(): Promise<Page> {
        if (this.userDataDir) {
            if (!this.context) {
                this.context = await launchClipperContext(this.userDataDir, true);
            }
            return this.context.newPage();
        }

        if (!this.browser || !this.browser.isConnected()) {
            this.browser = await chromium.launch({
                headless: true,
                channel: process.platform === "win32" ? "msedge" : undefined,
            });
        }
        return this.browser.newPage();
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
        const page: Page = await this.getPage();

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
            await page.close();
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
     * Gracefully shuts down the browser instance.
     */
    async [Symbol.asyncDispose](): Promise<void> {
        if (this.context) {
            console.log("Closing Clipper browser context...");
            await this.context.close();
            this.context = null;
            this.browser = null;
        } else if (this.browser) {
            console.log("Closing Clipper browser...");
            await this.browser.close();
            this.browser = null;
        }
    }
}
