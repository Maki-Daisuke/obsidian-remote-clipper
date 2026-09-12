---
type: Component
title: Bot Abstract Layer
description: Chat-platform abstraction (Discord/Matrix) behind a common interface, plus URL detection.
resource: ../src/bot-factory.ts
tags: [bot, discord, matrix, abstraction]
timestamp: 2026-09-12T00:00:00Z
---

# Bot Abstract Layer

To support multiple chat platforms (Discord, Matrix, etc.), the bot logic is abstracted behind an interface and a class factory method (`src/bot-factory.ts`).

## Interface: `Bot`

Utilizes `Symbol.asyncDispose` (TypeScript 5.2+) for automatic resource management.

```typescript
export type ProcessResult = "success" | "warning" | "error";

export interface Bot extends AsyncDisposable {
  destroy(): Promise<void>;
}
```

## Bot Implementations

- **`DiscordBot`**: Encapsulates Discord-specific logic using `discord.js`.
- **`MatrixBot`**: Encapsulates Matrix logic using `matrix-bot-sdk`, including Native Node.js bindings via Rust for decrypting End-to-End Encrypted (E2EE) rooms.

Both connect to their respective services, scan for unprocessed historical messages upon startup (Stateless Recovery — see [Error Handling](error-handling.md)), and set up message listeners to trigger the [Clipping Pipeline](clipping-pipeline.md).

## URL Detection Logic

URLs are extracted from message content using a regular expression:

```typescript
const URL_REGEX = /https?:\/\/[^\s<>]+/gi;
const urls = message.content.match(URL_REGEX) ?? [];
```

- If a single message contains **multiple URLs**, each is clipped individually.
- Non-URL text in the message is ignored.

Back to [index](index.md).
