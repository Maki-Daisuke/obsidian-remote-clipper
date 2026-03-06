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
    const vaultArgs = config.obsidianVault ? [`vault=${config.obsidianVault}`] : [];

    // To avoid command line length limits, long content is split into chunks.
    // A safe chunk size is chosen (e.g., 4000 characters)
    const chunkGenerator = markdownChunker(markdownContent, 4000);

    // 1. Create the note with the first chunk
    const firstChunk = chunkGenerator.next().value;
    try {
        await execFileAsync("obsidian", [
            ...vaultArgs,
            "create",
            `path=${filePath}`,
            `content=${firstChunk}`
        ]);
    } catch (error: any) {
        throw new Error(`Failed to create note via Obsidian CLI: ${error.message}`);
    }

    // 2. Append the remaining chunks
    for (const chunk of chunkGenerator) {
        try {
            await execFileAsync("obsidian", [
                ...vaultArgs,
                "append",
                `path=${filePath}`,
                `content=${chunk}`,
                `inline`
            ]);
        } catch (error: any) {
            throw new Error(`Failed to append chunk to note via Obsidian CLI: ${error.message}`);
        }
    }
}

function* markdownChunker(text: string, chunkSize: number): Generator<string> {
    let head = 0, pos = 0;
    for (let p = text.indexOf('\n'); p >= 0; p = text.indexOf('\n', pos)) {
        if (p + 1 - head < chunkSize) {
            pos = p + 1;
            continue;
        }
        if (pos - head > 0) {
            yield text.slice(head, pos);
            head = pos;
            if (p + 1 - head < chunkSize) {
                pos = p + 1;
                continue;
            }
        }
        pos = p + 1;
        // Hard-slice if a single line exceeds the max chunk size
        while (pos - head >= chunkSize) {
            yield text.slice(head, head + chunkSize);
            head += chunkSize;
        }
    }
    while (text.length - head >= chunkSize) {
        yield text.slice(head, head + chunkSize);
        head += chunkSize;
    }
    if (head < text.length) {
        yield text.slice(head);
    }
}