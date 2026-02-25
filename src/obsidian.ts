import type { Config } from "./config.js";

/**
 * Check if the Obsidian Local REST API is reachable.
 *
 * Sends a GET request to the root endpoint.
 * Returns true if the server responds (regardless of auth status).
 */
export async function isObsidianAvailable(config: Config): Promise<boolean> {
    try {
        const response = await fetch(config.obsidianApiUrl, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Save a Markdown file to the Obsidian vault via the Local REST API.
 *
 * Uses `PUT /vault/{filePath}` to create or overwrite a file.
 *
 * @param filePath - Path relative to vault root (e.g., "Clippings/Article_abc123.md")
 * @param markdownContent - Full Markdown content including frontmatter
 * @param config - Application configuration
 * @throws Error if the API request fails
 */
export async function saveToVault(
    filePath: string,
    markdownContent: string,
    config: Config,
): Promise<void> {
    const url = `${config.obsidianApiUrl}vault/${encodeURIComponent(filePath)}`;

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "text/markdown",
            Authorization: `Bearer ${config.obsidianApiKey}`,
        },
        body: markdownContent,
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new Error(
            `Failed to save to Obsidian vault (HTTP ${response.status}): ${errorBody}`
        );
    }
}
