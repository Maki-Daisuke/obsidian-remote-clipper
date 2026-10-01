import { describe, it, expect } from "vitest";
import { parseBrowserIdleTimeoutMs } from "../config.js";

describe("parseBrowserIdleTimeoutMs", () => {
    it("returns default 300,000ms (5 mins) when input is undefined", () => {
        expect(parseBrowserIdleTimeoutMs(undefined)).toBe(300000);
    });

    it("returns default 300,000ms when input is empty string", () => {
        expect(parseBrowserIdleTimeoutMs("   ")).toBe(300000);
    });

    it("parses valid seconds correctly into milliseconds", () => {
        expect(parseBrowserIdleTimeoutMs("60")).toBe(60000);
        expect(parseBrowserIdleTimeoutMs("0")).toBe(0);
        expect(parseBrowserIdleTimeoutMs("600")).toBe(600000);
    });

    it("returns default 300,000ms when input is invalid or negative", () => {
        expect(parseBrowserIdleTimeoutMs("abc")).toBe(300000);
        expect(parseBrowserIdleTimeoutMs("-10")).toBe(300000);
    });
});
