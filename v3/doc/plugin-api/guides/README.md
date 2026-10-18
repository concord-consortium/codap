# Guides

> **Applies to:** CODAP v3 · **Verified:** 2026-09-25 against `main` @ `ae2105cf4`

Narrative chapters covering plugin-facing behavior that spans resources, rather than belonging to
any one of them. For per-resource reference, see [the index](../README.md).

## Chapters

- **[Undo and redo](undo-and-redo.md)** — how a plugin puts its own actions on CODAP's undo
  history, answers undo and redo, and drives them from buttons of its own.
- **[How CODAP processes requests](request-processing.md)** — order and responses, array
  requests, sending many cases, and holding requests while the user edits.
- **[Language and locale](locale.md)** — how a plugin learns CODAP's language, and what happens
  when the user switches it.

## Planned chapters

These arrive with Phase 5 of the [plan](../../plugin-api-doc-update-plan.md):

- **Embedded server mode** — CODAP running inside *your* page and exposing the same API to it,
  rather than the plugin running inside CODAP.

## Interim sources

Until those are written, the internal design documents are the best available material. They were
written for CODAP developers rather than plugin authors, so expect implementation detail and
occasional references to internals that are not part of the API:

| Topic | Document |
|---|---|
| Embedding CODAP / embedded-server mode | [`../../embedding-codap.md`](../../embedding-codap.md) |
| Tour API | [`../../plugin-tour-api.md`](../../plugin-tour-api.md) |

Treat them as background, not as API contract: where one of these documents and a resource page
disagree, the resource page is authoritative, and where neither is verified against the code, the
code wins.
