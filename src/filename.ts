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
 * Generate a human-readable timestamp string for filenames.
 *
 * Format: `YYYYMMDD_HHMMSS` (e.g., "20260226_123456")
 */
export function generateTimestampString(date: Date = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Build a unique filename for a clipped article.
 *
 * Format: `{sanitized-title}_{timestamp}.md`
 *
 * @param title - The page title extracted by Defuddle
 * @returns A unique, filesystem-safe filename
 */
export function buildFilename(title: string): string {
    const timestamp = generateTimestampString();
    const sanitized = sanitizeTitle(title);
    return `${sanitized} - ${timestamp}.md`;
}
