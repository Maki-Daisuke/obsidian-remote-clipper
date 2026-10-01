/**
 * A lightweight async mutex for serializing asynchronous operations.
 * Uses Promise.withResolvers() (available in Node.js 22+) to maintain
 * a strictly ordered queue of pending tasks.
 */
export class AsyncLock {
    private promise: Promise<void> = Promise.resolve();

    /**
     * Executes the given async action exclusively, waiting for any previously
     * queued actions to finish before starting.
     *
     * @param action - Async operation to run under the lock
     * @returns The result of the action
     */
    async runExclusive<T>(action: () => Promise<T>): Promise<T> {
        const { promise: nextPromise, resolve: release } = Promise.withResolvers<void>();
        const previousPromise = this.promise;
        this.promise = nextPromise;

        await previousPromise;
        try {
            return await action();
        } finally {
            release();
        }
    }
}
