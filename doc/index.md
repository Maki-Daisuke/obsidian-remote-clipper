---
type: Index
title: Obsidian Remote Clipper — Design Knowledge
description: Entry point to the internal architecture, component design, and design rationales of Obsidian Remote Clipper.
tags: [index, design, architecture]
timestamp: 2026-09-12T00:00:00Z
---

# Obsidian Remote Clipper — Design Knowledge

Internal design documentation, organized as an [Open Knowledge Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing) bundle: one concept per file, each with YAML frontmatter, cross-linked with plain markdown links.

For installation and day-to-day usage, see the [README](../README.md).

## Concepts

- [Architecture](architecture.md) — system overview, the stateless design principle, and the tech stack.
- [Bot Layer](bot-layer.md) — the chat-platform abstraction and URL detection.
- [Clipping Pipeline](clipping-pipeline.md) — rendering, authenticated clipping, and content extraction.
- [File Naming](file-naming.md) — the vault filename convention and uniqueness guarantee.
- [Obsidian Integration](obsidian-integration.md) — writing to the vault via the Local REST API.
- [Error Handling](error-handling.md) — result tiers and startup recovery.
- [Rationales](rationales.md) — the "why" behind the key design decisions.
