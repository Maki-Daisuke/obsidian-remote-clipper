---
type: Component
title: Obsidian Integration
description: How clips are written to the vault through the Obsidian Local REST API.
resource: ../src/obsidian.ts
tags: [obsidian, rest-api, integration]
timestamp: 2026-09-12T00:00:00Z
---

# Obsidian Integration (`obsidian.ts`)

The bot uses the **Vault Files** endpoints of the Local REST API to save clips to the Vault.

## Authentication

All requests require a Bearer Token:

```http
Authorization: Bearer {OBSIDIAN_API_KEY}
```

## Endpoint Used

**`PUT {OBSIDIAN_API_URL}vault/{filePath}` — Create or Overwrite a File**

Creates a new file in the vault or overwrites an existing one.

```http
PUT /vault/Clippings/Example-Article - 20260224_120000.md
Content-Type: text/markdown
Authorization: Bearer {API_KEY}

---
title: "Example Article"
source: "https://example.com/article"
author: "John Doe"
clipped: "2026-02-24T12:00:00+09:00"
---

# Example Article

Article content in Markdown...
```

| Response                 | Meaning                          |
| ------------------------ | -------------------------------- |
| `204 No Content`         | Success                          |
| `400 Bad Request`        | Invalid filename or Content-Type |
| `405 Method Not Allowed` | Path points to a directory       |

## Connection Configuration

The base URL is configured via `OBSIDIAN_API_URL` (e.g., `http://127.0.0.1:27123/`).

> ℹ️ If you use HTTPS with a self-signed certificate, you must set `NODE_TLS_REJECT_UNAUTHORIZED=0` in your environment.

The choice of the REST API over the `obsidian://` URL scheme is explained in [Rationales](rationales.md). Filenames follow the [File Naming Convention](file-naming.md).

Back to [index](index.md).
