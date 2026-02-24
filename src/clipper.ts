import { chromium, type Browser, type Page } from "playwright";
import { Defuddle } from "defuddle/node";

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

let browser: Browser | null = null;

/**
 * Get or launch the shared Chromium browser instance.
 * Reuses a single browser across clips for efficiency.
 */
async function getBrowser(): Promise<Browser> {
    if (!browser || !browser.isConnected()) {
        browser = await chromium.launch({ headless: true });
    }
    return browser;
}

/**
 * Gracefully close the shared browser instance.
 * Should be called during application shutdown.
 */
export async function closeBrowser(): Promise<void> {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

/**
 * Build a YAML frontmatter string from clip metadata.
 */
function buildFrontmatter(clip: ClipResult, clippedAt: string): string {
    const fields: string[] = [];

    fields.push(`title: ${JSON.stringify(clip.title)}`);
    fields.push(`source: ${JSON.stringify(clip.url)}`);

    if (clip.author) {
        fields.push(`author: ${JSON.stringify(clip.author)}`);
    }
    if (clip.description) {
        fields.push(`description: ${JSON.stringify(clip.description)}`);
    }
    if (clip.siteName) {
        fields.push(`site: ${JSON.stringify(clip.siteName)}`);
    }
    if (clip.published) {
        fields.push(`published: ${JSON.stringify(clip.published)}`);
    }

    fields.push(`clipped: ${JSON.stringify(clippedAt)}`);

    if (clip.isError) {
        fields.push(`error: true`);
    }

    return `---\n${fields.join("\n")}\n---`;
}

/**
 * Build the full Markdown document with frontmatter.
 */
export function buildMarkdownDocument(clip: ClipResult): string {
    const clippedAt = new Date().toISOString();
    const frontmatter = buildFrontmatter(clip, clippedAt);
    return `${frontmatter}\n\n${clip.content}\n`;
}

/**
 * Clip a URL by rendering it with Playwright and extracting content with Defuddle.
 *
 * On site errors (e.g. 403, 500), returns an error clip containing the
 * status information so it can be saved to Obsidian for review.
 *
 * @param url - The URL to clip
 * @returns The extracted clip result
 */
export async function clipUrl(url: string): Promise<ClipResult> {
    const instance = await getBrowser();
    const page: Page = await instance.newPage();

    try {
        const response = await page.goto(url, {
            waitUntil: "load",
            timeout: 30000,
        });

        // Wait for JS-rendered content to appear
        await page.waitForTimeout(2000);

        // Use the final URL after all redirects (e.g. short URLs → full URLs)
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
        const errorMessage =
            error instanceof Error ? error.message : String(error);

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
