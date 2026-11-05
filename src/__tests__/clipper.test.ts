import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Clipper } from "../clipper.js";
import type { Config } from "../config.js";

const { page, browser } = vi.hoisted(() => {
    const page = {
        goto: vi.fn(),
        waitForTimeout: vi.fn(),
        url: vi.fn(),
        evaluate: vi.fn(),
        content: vi.fn(),
        close: vi.fn(),
    };
    const browser = {
        isConnected: () => true,
        newPage: vi.fn().mockResolvedValue(page),
        close: vi.fn(),
    };
    return { page, browser };
});

vi.mock("playwright", () => ({
    chromium: {
        launch: vi.fn().mockResolvedValue(browser),
    },
}));

const config: Config = {
    botConfig: {},
    obsidianApiKey: "",
    obsidianApiUrl: "http://127.0.0.1:27123/",
    destinationFolder: "Clippings/",
    browserIdleTimeoutMs: 0,
};

describe("Clipper extraction", () => {
    beforeEach(() => {
        vi.stubEnv("CHROME_USER_DATA_DIR", "");
        page.goto.mockResolvedValue({ status: () => 200 });
        page.url.mockReturnValue("https://example.com/articles/final");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
    });

    it("extracts Markdown, metadata and relative links from rendered HTML", async () => {
        page.content.mockResolvedValue(`<!DOCTYPE html>
            <html><head>
                <title>Growing a kitchen garden</title>
                <meta name="author" content="Sample Author">
                <meta name="description" content="Practical advice for a kitchen garden.">
                <meta property="og:site_name" content="Garden Journal">
                <meta property="article:published_time" content="2026-10-01T12:00:00Z">
            </head><body><article>
                <h1>Growing a kitchen garden</h1>
                <p>A kitchen garden provides fresh vegetables throughout the year.
                Choose a sunny position with good drainage and prepare the soil
                before planting. Regular watering helps young seedlings establish
                healthy roots and produce a reliable harvest.</p>
                <h2>Preparing the soil</h2>
                <p>Add <strong>well-rotted compost</strong> before sowing seeds.
                Organic matter improves soil structure and helps retain moisture.
                Read the <a href="/guides/compost">compost guide</a> for detailed
                instructions on preparing a productive vegetable bed.</p>
            </article></body></html>`);

        await using clipper = new Clipper(config);
        const result = await clipper.clip("https://example.com/short");

        expect(result).toMatchObject({
            title: "Growing a kitchen garden",
            author: "Sample Author",
            description: "Practical advice for a kitchen garden.",
            siteName: "Garden Journal",
            published: "2026-10-01T12:00:00Z",
            url: "https://example.com/articles/final",
            isError: false,
        });
        expect(result.content).toContain("## Preparing the soil");
        expect(result.content).toContain("**well-rotted compost**");
        expect(result.content).toContain("[compost guide](https://example.com/guides/compost)");
        expect(result.content).not.toContain("<p>");
        expect(page.close).toHaveBeenCalledOnce();
    });

    it("extracts content when optional metadata is missing", async () => {
        page.content.mockResolvedValue(`<!DOCTYPE html>
            <html><head><title>Winter garden notes</title></head>
            <body><article>
                <h1>Winter garden notes</h1>
                <p>Cover exposed vegetable beds with mulch before winter arrives.
                This protects the soil from heavy rain and prevents weeds from
                taking over. Leave room around established plants so that air
                can circulate and their stems stay dry.</p>
                <p>Check stored seeds and make a plan for the next growing season.
                Rotating crops between beds helps reduce pests and keeps the soil
                productive. Record what worked well before ordering new seeds.</p>
            </article></body></html>`);

        await using clipper = new Clipper(config);
        const result = await clipper.clip("https://example.com/articles/final");

        expect(result.isError).toBe(false);
        expect(result.title).toBe("Winter garden notes");
        expect(result.content).toContain("Cover exposed vegetable beds");
        expect(result.author).toBeUndefined();
        expect(result.published).toBeUndefined();
    });
});
