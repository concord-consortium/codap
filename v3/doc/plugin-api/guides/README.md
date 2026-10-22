# Guides

> **Applies to:** CODAP v3 · **Verified:** 2026-10-18

Narrative chapters covering plugin-facing behavior that spans resources, rather than belonging to
any one of them. For per-resource reference, see [the index](../README.md).

## Chapters

- **[Undo and redo](undo-and-redo.md)** — how a plugin puts its own actions on CODAP's undo
  history, answers undo and redo, and drives them from buttons of its own.
- **[How CODAP processes requests](request-processing.md)** — order and responses, array
  requests, sending many cases, and holding requests while the user edits.
- **[Language and locale](locale.md)** — how a plugin learns CODAP's language, and what happens
  when the user switches it.
- **[Embedding CODAP in your page](embedded-server.md)** — CODAP running inside *your* page and
  answering the same API, rather than a plugin running inside CODAP.

## Interim sources

For the topics below, which have no chapter yet, the internal design documents are the best
available material. They were written for CODAP developers rather than plugin authors, so expect
implementation detail and occasional references to internals that are not part of the API:

| Topic | Document |
|---|---|
| Tour API | [`../../plugin-tour-api.md`](../../plugin-tour-api.md) |

Treat them as background, not as API contract: where one of these documents and a resource page
disagree, the resource page is authoritative, and where neither is verified against the code, the
code wins.
