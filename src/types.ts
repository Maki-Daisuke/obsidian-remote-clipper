/** Outcome of processing a URL, used by the bot to provide feedback (reactions). */
export type ProcessResult = "success" | "warning" | "error";

/**
 * Generic Bot interface for various chat platforms.
 */
export interface Bot extends AsyncDisposable {
    /** Gracefully shuts down the bot. Alias for [Symbol.asyncDispose]. */
    destroy(): Promise<void>;
}
