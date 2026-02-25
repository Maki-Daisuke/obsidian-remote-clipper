import { describe, it, expect } from "vitest";
import { sanitizeTitle, generateTimestampString, buildFilename } from "../filename.js";

describe("sanitizeTitle", () => {
    it("replaces invalid filename characters with hyphens", () => {
        expect(sanitizeTitle('Hello: World / "Test"')).toBe("Hello- World - -Test");
    });

    it("collapses consecutive hyphens into one", () => {
        expect(sanitizeTitle("A::B///C")).toBe("A-B-C");
    });

    it("trims leading and trailing hyphens", () => {
        expect(sanitizeTitle("/Hello World/")).toBe("Hello World");
    });

    it("trims whitespace", () => {
        expect(sanitizeTitle("  Hello World  ")).toBe("Hello World");
    });

    it("returns 'Untitled' for empty string", () => {
        expect(sanitizeTitle("")).toBe("Untitled");
    });

    it("returns 'Untitled' for string with only invalid chars", () => {
        expect(sanitizeTitle("///:::***")).toBe("Untitled");
    });

    it("handles a typical article title", () => {
        expect(sanitizeTitle("How to Build a REST API with Node.js")).toBe(
            "How to Build a REST API with Node.js"
        );
    });

    it("handles pipe characters", () => {
        expect(sanitizeTitle("Title | Site Name")).toBe("Title - Site Name");
    });
});

describe("generateTimestampString", () => {
    it("returns a formatted timestamp string", () => {
        const date = new Date("2026-02-26T12:34:56.000Z");
        const ts = generateTimestampString(date);
        expect(ts).toMatch(/^[0-9]{8}_[0-9]{6}$/);
    });

    it("returns different strings for different times", () => {
        const ts1 = generateTimestampString(new Date(1000000));
        const ts2 = generateTimestampString(new Date(2000000));
        expect(ts1).not.toBe(ts2);
    });
});

describe("buildFilename", () => {
    it("returns a string ending with .md", () => {
        const filename = buildFilename("My Article");
        expect(filename).toMatch(/\.md$/);
    });

    it("contains the sanitized title and a timestamp", () => {
        const filename = buildFilename("My Article");
        expect(filename).toMatch(/^My Article - [0-9]{8}_[0-9]{6}\.md$/);
    });

    it("sanitizes special characters in the title", () => {
        const filename = buildFilename("Hello: World");
        expect(filename).toMatch(/^Hello- World - [0-9]{8}_[0-9]{6}\.md$/);
    });

    it("uses 'Untitled' for empty title", () => {
        const filename = buildFilename("");
        expect(filename).toMatch(/^Untitled - [0-9]{8}_[0-9]{6}\.md$/);
    });

    it("generates correctly formatted filenames", () => {
        const filename1 = buildFilename("Test");
        expect(filename1).toMatch(/^Test - [0-9]{8}_[0-9]{6}\.md$/);
    });
});
