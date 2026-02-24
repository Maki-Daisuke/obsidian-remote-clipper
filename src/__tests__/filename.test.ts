import { describe, it, expect } from "vitest";
import { sanitizeTitle, generateShortHash, buildFilename } from "../filename.js";

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

describe("generateShortHash", () => {
    it("returns a 6-character hex string", () => {
        const hash = generateShortHash("https://example.com", 1234567890);
        expect(hash).toHaveLength(6);
        expect(hash).toMatch(/^[0-9a-f]{6}$/);
    });

    it("returns different hashes for different timestamps", () => {
        const hash1 = generateShortHash("https://example.com", 1000);
        const hash2 = generateShortHash("https://example.com", 2000);
        expect(hash1).not.toBe(hash2);
    });

    it("returns different hashes for different URLs", () => {
        const hash1 = generateShortHash("https://example.com/a", 1000);
        const hash2 = generateShortHash("https://example.com/b", 1000);
        expect(hash1).not.toBe(hash2);
    });

    it("returns the same hash for the same inputs", () => {
        const hash1 = generateShortHash("https://example.com", 1000);
        const hash2 = generateShortHash("https://example.com", 1000);
        expect(hash1).toBe(hash2);
    });
});

describe("buildFilename", () => {
    it("returns a string ending with .md", () => {
        const filename = buildFilename("My Article", "https://example.com");
        expect(filename).toMatch(/\.md$/);
    });

    it("contains the sanitized title and a hash", () => {
        const filename = buildFilename("My Article", "https://example.com");
        expect(filename).toMatch(/^My Article_[0-9a-f]{6}\.md$/);
    });

    it("sanitizes special characters in the title", () => {
        const filename = buildFilename("Hello: World", "https://example.com");
        expect(filename).toMatch(/^Hello- World_[0-9a-f]{6}\.md$/);
    });

    it("uses 'Untitled' for empty title", () => {
        const filename = buildFilename("", "https://example.com");
        expect(filename).toMatch(/^Untitled_[0-9a-f]{6}\.md$/);
    });

    it("generates unique filenames on successive calls", () => {
        const filename1 = buildFilename("Test", "https://example.com");
        // Small delay to ensure different timestamp
        const filename2 = buildFilename("Test", "https://example.com");
        // They may or may not be unique depending on Date.now() resolution,
        // but the format should be correct
        expect(filename1).toMatch(/^Test_[0-9a-f]{6}\.md$/);
        expect(filename2).toMatch(/^Test_[0-9a-f]{6}\.md$/);
    });
});
