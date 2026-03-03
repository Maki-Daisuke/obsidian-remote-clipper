import type { Config } from "./config.js";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Check if the Obsidian CLI is available.
 *
 * Runs `obsidian --help` to verify the CLI is installed and in PATH.
 */
export async function isObsidianAvailable(): Promise<boolean> {
    try {
        await execFileAsync("obsidian", ["--help"]);
        return true;
    } catch {
        return false;
    }
}

/**
 * Save a Markdown file to the Obsidian vault via the Obsidian CLI.
 *
 * Uses `obsidian create` and `obsidian append` to create or overwrite a file.
 * To avoid command line length limits, long content is split into chunks.
 *
 * @param filePath - Path relative to vault root (e.g., "Clippings/Article_abc123.md")
 * @param markdownContent - Full Markdown content including frontmatter
 * @param config - Application configuration
 * @throws Error if the CLI command fails
 */
export async function saveToVault(
    filePath: string,
    markdownContent: string,
    config: Config,
): Promise<void> {
    // To avoid command line length limits, long content is split into chunks.
    // A safe chunk size is chosen (e.g., 4000 characters)
    const chunkSize = 4000;

    // 1. Create the note with the first chunk
    const firstChunk = markdownContent.slice(0, chunkSize);
    try {
        await execFileAsync("obsidian", [
            "create",
            `path=${filePath}`,
            `content=${firstChunk}`
        ]);
    } catch (error: any) {
        throw new Error(`Failed to create note via Obsidian CLI: ${error.message}`);
    }

    // 2. Append the remaining chunks
    for (let i = chunkSize; i < markdownContent.length; i += chunkSize) {
        const chunk = markdownContent.slice(i, i + chunkSize);
        try {
            await execFileAsync("obsidian", [
                "append",
                `path=${filePath}`,
                `content=${chunk}`
            ]);
        } catch (error: any) {
            throw new Error(`Failed to append chunk to note via Obsidian CLI: ${error.message}`);
        }
    }
}
