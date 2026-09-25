# Guides

> **Applies to:** CODAP v3 · **Verified:** 2026-09-25 against `main` @ `ae2105cf4`

Narrative chapters covering plugin-facing behavior that spans resources, rather than belonging to
any one of them. For per-resource reference, see [the index](../README.md).

## Planned chapters

These arrive with Phase 5 of the [plan](../../plugin-api-doc-update-plan.md) (CODAP-1540):

- **Embedded server mode** — CODAP running inside *your* page and exposing the same API to it,
  rather than the plugin running inside CODAP.
- **Request processing and coalescing** — how consecutive single-item `create` requests are
  batched, and what that means for response timing when streaming data in.
- **Undo and redo** — how plugin-initiated changes participate in CODAP's undo stack.
- **Locale and internationalization** — `lang` versus `locale`, and handling locale changes.

## Interim sources

Until those are written, the internal design documents are the best available material. They were
written for CODAP developers rather than plugin authors, so expect implementation detail and
occasional references to internals that are not part of the API:

| Topic | Document |
|---|---|
| Embedding CODAP / embedded-server mode | [`../../embedding-codap.md`](../../embedding-codap.md) |
| Request processing and coalescing | [`../../plugin-request-processing.md`](../../plugin-request-processing.md) |
| Undo and redo | [`../../plugin-undo-redo.md`](../../plugin-undo-redo.md) |
| Tour API | [`../../plugin-tour-api.md`](../../plugin-tour-api.md) |
| Locale switching | [`../../plugin-locale-switching-design.md`](../../plugin-locale-switching-design.md) |

Treat them as background, not as API contract: where one of these documents and a resource page
disagree, the resource page is authoritative, and where neither is verified against the code, the
code wins.
