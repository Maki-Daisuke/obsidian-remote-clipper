import { MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin, RustSdkCryptoStorageProvider } from "matrix-bot-sdk";
import type { Bot, ProcessResult } from "./types.js";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const URL_REGEX = /https?:\/\/[^\s<>]+/gi;

const REACTION = {
    success: "✅",
    warning: "⚠️",
    error: "❌",
    processing: "⏳",
} as const;

export class MatrixBot implements Bot {
    private client: MatrixClient;
    private roomId: string;
    private processURL: (url: string) => Promise<ProcessResult>;

    private constructor(
        client: MatrixClient,
        roomId: string,
        processURL: (url: string) => Promise<ProcessResult>
    ) {
        this.client = client;
        this.roomId = roomId;
        this.processURL = processURL;
    }

    static async create(
        processURL: (url: string) => Promise<ProcessResult>,
        conf: Record<string, string>
    ): Promise<MatrixBot> {
        const homeserverUrl = conf["MATRIX_HOMESERVER_URL"];
        const accessToken = conf["MATRIX_ACCESS_TOKEN"];
        const roomId = conf["MATRIX_ROOM_ID"];

        if (!homeserverUrl || !accessToken || !roomId) {
            throw new Error("Missing Matrix configuration. Please provide MATRIX_HOMESERVER_URL, MATRIX_ACCESS_TOKEN, and MATRIX_ROOM_ID.");
        }

        const dataDir = path.join(process.cwd(), ".data");
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const syncStorePath = path.join(dataDir, "matrix-bot-sync.json");
        const storage = new SimpleFsStorageProvider(syncStorePath);
        const cryptoStorePath = path.join(dataDir, "matrix-bot-crypto");
        const cryptoStore = new RustSdkCryptoStorageProvider(cryptoStorePath);
        const client = new MatrixClient(homeserverUrl, accessToken, storage, cryptoStore);

        AutojoinRoomsMixin.setupOnClient(client);

        const bot = new MatrixBot(client, roomId, processURL);

        client.on("room.event", (roomId: string, event: any) => {
            if (roomId !== roomId) return;
        });

        // When using E2EE, messages are decrypted and emitted as 'room.decrypted_event'
        client.on("room.decrypted_event", async (eventRoomId: string, event: any) => {
            // Only process events in the configured room
            if (eventRoomId !== roomId) return;

            // Ignore events that are not our target message type
            if (event.type !== "m.room.message" || !event.content || event.content.msgtype !== "m.text") {
                return;
            }

            await bot.handleMessage(eventRoomId, event);
        });

        // Listen for standard unencrypted messages as well
        client.on("room.message", async (eventRoomId: string, event: any) => {
            // Only process events in the configured room
            if (eventRoomId !== roomId) return;

            // Ignore events that are not our target message type
            if (!event.content || event.content.msgtype !== "m.text") {
                return;
            }

            // Ignore if room is encrypted (handled by decrypted_event)
            const isEncrypted = await client.crypto.isRoomEncrypted(roomId);
            if (isEncrypted) return;

            await bot.handleMessage(eventRoomId, event);
        });

        await client.start();
        console.log(`Matrix Bot logged in and listening in room ${roomId}`);

        return bot;
    }

    private extractUrls(content: string): string[] {
        return content.match(URL_REGEX) ?? [];
    }

    private async addReaction(roomId: string, eventId: string, emoji: string) {
        try {
            await this.client.sendEvent(roomId, "m.reaction", {
                "m.relates_to": {
                    rel_type: "m.annotation",
                    event_id: eventId,
                    key: emoji
                }
            });
        } catch (error) {
            console.error("Failed to add reaction:", error);
        }
    }

    private async handleMessage(roomId: string, event: any): Promise<void> {
        const body = event.content.body || "";
        const urls = this.extractUrls(body);

        if (urls.length === 0) return;

        const eventId = event.event_id;

        // Ensure we don't process messages we've already reacted to 
        // (e.g., historical messages caught during initial sync)
        try {
            const myUserId = await this.client.getUserId();
            const relations = await this.client.doRequest(
                "GET",
                `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/relations/${encodeURIComponent(eventId)}/m.annotation`
            );
            const hasReacted = relations?.chunk?.some((rel: any) => rel.sender === myUserId);
            if (hasReacted) return;
        } catch (error) {
            console.error("Failed to fetch relations:", error);
        }

        await this.addReaction(roomId, eventId, REACTION.processing);

        let hasError = false;
        let hasWarning = false;

        for (const url of urls) {
            try {
                const result = await this.processURL(url);

                if (result === "error") {
                    hasError = true;
                    break;
                }
                if (result === "warning") {
                    hasWarning = true;
                }
            } catch (error) {
                console.error(`Error processing URL ${url}:`, error);
                hasError = true;
            }
        }

        // Note: Matrix doesn't easily let us *remove* a reaction without knowing the reaction event ID we just sent,
        // so we just add the new state reaction.

        if (hasError) {
            await this.addReaction(roomId, eventId, REACTION.error);
            await this.client.sendMessage(roomId, {
                msgtype: "m.text",
                body: "❌ Could not save to Obsidian. Please check if the service is running."
            });
        } else if (hasWarning) {
            await this.addReaction(roomId, eventId, REACTION.warning);
        } else {
            await this.addReaction(roomId, eventId, REACTION.success);
        }
    }

    async destroy(): Promise<void> {
        console.log("Destroying Matrix bot...");
        this.client.stop(); // Stop the sync loop

        // Give the sync loop a small moment to actually stop emitting events
        await new Promise(resolve => setTimeout(resolve, 500));

        // We do not need to explicitly close the crypto/storage instances,
        // but stopping the client sync is required to prevent it from using
        // them after the parent process tries to exit.
    }

    async [Symbol.asyncDispose](): Promise<void> {
        await this.destroy();
    }
}
