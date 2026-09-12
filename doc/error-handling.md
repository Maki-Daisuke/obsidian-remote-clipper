---
type: Component
title: Error Handling Strategy
description: How processing results are surfaced via chat reactions, and how unprocessed messages are recovered on startup.
tags: [error-handling, reactions, recovery]
timestamp: 2026-09-12T00:00:00Z
---

# Error Handling Strategy

Following the [stateless design](architecture.md), all processing results are communicated via **Discord reactions**.

| Tier        | Scenario                 | Behavior                                                    | Discord Notification              |
| ----------- | ------------------------ | ----------------------------------------------------------- | --------------------------------- |
| **Success** | Clip successful          | Markdown saved to Vault                                     | ✅ Reaction                       |
| **Site**    | 403 / 500 / Timeout      | Error details saved as a clip (viewable in Obsidian)        | ⚠️ Reaction                       |
| **Storage** | Obsidian API unreachable | Clip is NOT saved. URL remains in Discord as a queue item   | ❌ Reaction + error message reply |
| **System**  | Bot is offline           | URLs accumulate in the channel. Processed when bot restarts | —                                 |

## Unprocessed Message Recovery on Startup

When the bot starts, it scans recent messages in the monitored channel and processes any messages that do **not** have a bot reaction (✅/⚠️/❌), treating them as unprocessed. This recovery step is part of the [Bot Layer](bot-layer.md).

For Discord, recovery checks only the **latest 100 messages** in the monitored channel. This limit counts all messages, including non-URL posts and bot replies, not just messages containing URLs. Older unprocessed messages are not automatically recovered because the bot does not paginate through earlier history. After a long offline period or heavy channel activity, repost URLs from older unprocessed messages to bring them back into the recovery window.

Back to [index](index.md).
