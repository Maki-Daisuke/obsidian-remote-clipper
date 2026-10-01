import { describe, it, expect } from "vitest";
import { AsyncLock } from "../lock.js";

describe("AsyncLock", () => {
    it("executes actions serially", async () => {
        const lock = new AsyncLock();
        const order: number[] = [];

        const task1 = lock.runExclusive(async () => {
            await new Promise((r) => setTimeout(r, 20));
            order.push(1);
            return "res1";
        });

        const task2 = lock.runExclusive(async () => {
            await new Promise((r) => setTimeout(r, 10));
            order.push(2);
            return "res2";
        });

        const [r1, r2] = await Promise.all([task1, task2]);

        expect(r1).toBe("res1");
        expect(r2).toBe("res2");
        expect(order).toEqual([1, 2]);
    });

    it("releases lock and allows subsequent tasks even if an error is thrown", async () => {
        const lock = new AsyncLock();
        const order: string[] = [];

        const failingTask = lock.runExclusive(async () => {
            order.push("start-fail");
            throw new Error("task failed");
        });

        const succeedingTask = lock.runExclusive(async () => {
            order.push("succeed");
            return "ok";
        });

        await expect(failingTask).rejects.toThrow("task failed");
        const res = await succeedingTask;

        expect(res).toBe("ok");
        expect(order).toEqual(["start-fail", "succeed"]);
    });
});
