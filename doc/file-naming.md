---
type: Component
title: File Naming Convention
description: How clipped Markdown files are named in the vault and why names are effectively unique.
resource: ../src/filename.ts
tags: [filename, vault, uniqueness]
timestamp: 2026-09-12T00:00:00Z
---

# File Naming Convention (`filename.ts`)

Markdown files saved to the Vault follow this naming pattern:

```
{sanitized-title} - {timestamp}.md
```

## Components

| Element           | Description                                                  | Example           |
| ----------------- | ------------------------------------------------------------ | ----------------- |
| `sanitized-title` | Page title with invalid filename characters removed/replaced | `Example-Article` |
| `timestamp`       | Timestamp string generated at clip time (`YYYYMMDD_HHMMSS`)  | `20260226_123456` |

## Uniqueness Guarantee

- The **timestamp** is derived from the system time at clip time (`YYYYMMDD_HHMMSS`).
- Since the timestamp differs down to the second, **filenames are highly likely to be unique** — even when clipping the same URL multiple times.
  - This ensures that clipping the same page again (or different pages that happen to have the identical title) will not accidentally overwrite existing files in your Vault.
- Sanitization replaces `/ \ : * ? " < > |` with hyphens and collapses consecutive hyphens into one.

This uniqueness property is what makes the [stateless, duplicate-tolerant design](architecture.md) safe.

Back to [index](index.md).
