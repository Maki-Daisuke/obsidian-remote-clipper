import { createHash } from "node:crypto";

/**
 * Characters that are invalid in filenames across Windows/macOS/Linux.
 * Replaced with hyphens during sanitization.
 */
const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g;
const CONSECUTIVE_HYPHENS = /-{2,}/g;
const LEADING_TRAILING_HYPHENS = /^-+|-+$/g;

/**
 * Sanitize a page title into a filesystem-safe string.
 *
 * - Replaces invalid filename characters with hyphens
 * - Collapses consecutive hyphens into one
 * - Trims leading/trailing hyphens and whitespace
 * - Falls back to "Untitled" if the result is empty
 */
export function sanitizeTitle(title: string): string {
    const sanitized = title
        .trim()
        .replace(INVALID_FILENAME_CHARS, "-")
        .replace(CONSECUTIVE_HYPHENS, "-")
        .replace(LEADING_TRAILING_HYPHENS, "");

    return sanitized || "Untitled";
}

/**
 * Generate a 6-character hex hash from a URL and timestamp.
 *
 * This ensures uniqueness even when the same URL is clipped multiple times,
 * since the timestamp will differ for each clip.
 */
export function generateShortHash(url: string, timestamp: number): string {
    const hash = createHash("sha256");
    hash.update(`${url}${timestamp}`);
    return hash.digest("hex").slice(0, 6);
}

/**
 * Build a unique filename for a clipped article.
 *
 * Format: `{sanitized-title}_{short-hash}.md`
 *
 * @param title - The page title extracted by Defuddle
 * @param url - The original URL of the page
 * @returns A unique, filesystem-safe filename
 */
export function buildFilename(title: string, url: string): string {
    const timestamp = Date.now();
    const sanitized = sanitizeTitle(title);
    const shortHash = generateShortHash(url, timestamp);
    return `${sanitized}_${shortHash}.md`;
}
