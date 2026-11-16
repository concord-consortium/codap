# Guides

> **Applies to:** CODAP v3 · **Verified:** 2026-10-18

Narrative chapters covering plugin-facing behavior that spans resources, rather than belonging to
any one of them. For per-resource reference, see [the index](../README.md).

## Chapters

- **[Undo and redo](undo-and-redo.md)** — how a plugin puts its own actions on CODAP's undo
  history, answers undo and redo, and drives them from buttons of its own.
- **[How CODAP processes requests](request-processing.md)** — order and responses, array
  requests, sending many cases, and holding requests while the user edits.
- **[Data types](data-types.md)** — how CODAP decides whether an attribute holds numbers,
  dates, colors or categories, and which values count as each.
- **[Language and locale](locale.md)** — how a plugin learns CODAP's language, and what happens
  when the user switches it.
- **[Embedding CODAP in your page](embedded-server.md)** — CODAP running inside *your* page and
  answering the same API, rather than a plugin running inside CODAP.

## Guides outside this folder

Two resources are documented by full guides that live alongside this reference rather than in it:

| Topic | Guide |
|---|---|
| Tour API (`tourElements` and the `interactiveFrame` tour and highlight actions) | [`../../plugin-tour-api.md`](../../plugin-tour-api.md) |
| UI notifications (`uiNotificationMonitor`) | [`../../plugin-ui-notifications.md`](../../plugin-ui-notifications.md) |
