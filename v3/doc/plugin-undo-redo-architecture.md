# Plugin Undo/Redo Architecture

## Overview

CODAP supports undo/redo for plugin actions through a relay protocol. CODAP does not know what the plugin did — it records that something undoable happened and stores callbacks that tell the plugin to undo or redo its own state. This document describes the architecture, the protocol, and the requirements plugins must satisfy to participate correctly.

## The Protocol

Communication uses the `undoChangeNotice` resource via the Data Interactive API.

### Plugin → CODAP (via `notify` on `undoChangeNotice`)

| Operation | Meaning |
|---|---|
| `undoableActionPerformed` | "I just did something undoable" |
| `undoButtonPress` | "The user clicked my undo button — please undo" |
| `redoButtonPress` | "The user clicked my redo button — please redo" |

All three operations return `{ success: true, values: { canUndo, canRedo } }`.

### CODAP → Plugin (sent during undo/redo execution)

| Operation | Meaning |
|---|---|
| `undoAction` | "Please undo your last action" |
| `redoAction` | "Please redo your last undone action" |
| `clearUndo` | "The undo stack was cleared" (with `canUndo`/`canRedo`) |
| `clearRedo` | "The redo stack was cleared" (with `canUndo`/`canRedo`) |

## How It Works

### Shared Undo Stack

Plugin undo entries live on CODAP's undo stack alongside entries from direct user interaction with CODAP tiles (graphs, tables, etc.). There is a single code path for both standalone mode (plugin owns the undo UI) and external/embedded mode (CODAP toolbar is visible).

When a plugin sends `undoableActionPerformed`, CODAP creates a history entry with custom undo/redo handlers that send `undoAction`/`redoAction` messages back to the originating plugin. The entry uses the existing `withCustomUndoRedo` mechanism — no MST state changes are recorded, only the side-effect callbacks.

When a plugin sends `undoButtonPress`, CODAP calls `document.undoLastAction()`. If the top of the stack is a plugin entry, the plugin receives an `undoAction` message. If the top is a CODAP entry (e.g., a graph setting the user changed), CODAP undoes that entry and the plugin does **not** receive an `undoAction` message. This is chronologically correct — the most recent action is always undone first, regardless of source.

### Plugin-Triggered Mutations Bypass Undo

When plugins create, update, or delete cases through the Data Interactive API, those mutations are applied via `applyModelChange` **without** undo/redo strings. This routes them through `withoutUndo()`, meaning they do not create undo entries.

This is intentional. A plugin action typically consists of two parts: (1) the plugin's internal state change, and (2) the resulting data mutations in CODAP. The plugin registers the entire logical action as a single `undoableActionPerformed` entry. When that entry is undone, CODAP sends `undoAction` to the plugin, and the plugin is responsible for reversing both its internal state and the data mutations.

If DI API mutations also created undo entries, the undo stack would contain duplicate or conflicting entries — one from the plugin's `undoableActionPerformed` and separate entries for each data mutation. This would break the undo model.

### Interleaving of Plugin and CODAP Entries

Because plugin and CODAP entries share a single undo stack, they interleave chronologically. Consider:

1. Plugin does something → plugin entry pushed
2. User changes a graph setting → CODAP entry pushed
3. Plugin does something → plugin entry pushed
4. User clicks undo in plugin → undoes step 3 (plugin entry)
5. User clicks undo again → undoes step 2 (CODAP entry, no `undoAction` sent)
6. User clicks undo again → undoes step 1 (plugin entry)

This is the correct behavior from the user's perspective.

### Proactive Notifications

CODAP broadcasts `clearUndo` / `clearRedo` notifications to all plugins whenever the undo or redo stack is emptied (`canUndo` or `canRedo` transitions from `true` to `false`). These are sent as `notify` messages on the `undoChangeNotice` resource with `{ operation, canUndo, canRedo }`.

### Standalone vs External Mode

- **Standalone mode** (`?standalone=<name>`): CODAP's toolbar is hidden. The plugin owns the undo UI and triggers undo/redo via `undoButtonPress`/`redoButtonPress`.
- **External/embedded mode** (default): CODAP's toolbar is visible and its undo/redo buttons are functional.

Both modes use the same shared-stack code path. The `interactiveFrame` GET response includes `externalUndoAvailable` (true in external mode) and `standaloneUndoModeAvailable` (true in standalone mode) so plugins can determine which mode is active.

## Plugin Requirements

Plugins that participate in the undo system **must** satisfy the following requirements.

### 1. Do Not Eagerly Pop Internal Undo State

When a plugin sends `undoButtonPress`, it **must not** eagerly pop from its own internal undo stack before receiving a response. CODAP may undo a CODAP entry instead of a plugin entry (see "Interleaving" above), in which case the plugin will not receive an `undoAction` callback. If the plugin had already popped its internal stack, its state would be out of sync.

The correct pattern: send `undoButtonPress`, wait for `undoAction` (if one arrives), and only then update internal undo state.

### 2. Handle `undoButtonPress` Without Receiving `undoAction`

When `undoButtonPress` causes a CODAP entry to be undone (not a plugin entry), the plugin receives `{ success: true, canUndo, canRedo }` but does **not** receive an `undoAction` callback. Plugins must handle this case without error.

### 3. Interpret `canUndo`/`canRedo` as Reflecting All Actions

The `canUndo` and `canRedo` values in responses and notifications reflect the state of the shared undo stack, which includes both plugin and CODAP entries. A plugin's undo button may appear enabled when the only remaining undo entry is a CODAP action, not a plugin action. This is correct — the user can undo something.

### 4. Reverse Both Internal State and Data Mutations on `undoAction`

When a plugin receives `undoAction`, it must reverse both its internal state change and any data mutations it made through the DI API. CODAP does not separately track or undo the DI API mutations — the plugin's `undoableActionPerformed` entry is the sole undo mechanism for the entire logical action.

### 5. Respond to `undoAction`/`redoAction` with Success or Failure

Plugins must respond with `{ success: true }` or `{ success: false }`. On failure, CODAP logs a warning. There is no rollback mechanism — the undo history state has already been modified.

## Key Files

| File | Role |
|---|---|
| `src/data-interactive/handlers/undo-change-notice-handler.ts` | Handler for all three operations; custom undo/redo patcher registration |
| `src/models/document/create-document-model.ts` | Proactive `clearUndo`/`clearRedo` notification reaction |
| `src/models/history/with-custom-undo-redo.ts` | `withCustomUndoRedo` — registers custom patches on history entries |
| `src/models/history/custom-undo-redo-registry.ts` | Registry for custom undo/redo patchers |
| `src/models/document/document.ts` | `canUndo`/`canRedo` views, `undoLastAction`/`redoLastAction` |
| `src/models/history/app-history-service.ts` | Routes `applyModelChange` to undo or `withoutUndo` based on undo strings |
| `src/components/web-view/web-view-model.ts` | `broadcastMessage` to plugin iframe |
| `src/data-interactive/handlers/interactive-frame-handler.ts` | Reports `externalUndoAvailable` / `standaloneUndoModeAvailable` |

## Known Limitations

1. **No async support in undo handlers.** The custom undo/redo patchers send messages to the plugin iframe but do not wait for the response. If the plugin fails to undo/redo, the undo stack has already been modified.

2. **Plugin removal.** If a plugin tile is removed, undo entries referencing it will attempt to send messages to a nonexistent tile. The `broadcastMessage` call silently skips missing tiles, so this is a no-op rather than an error — but the user's action is not actually undone.

3. **No per-plugin undo scope.** Plugins cannot undo only their own actions. `undoButtonPress` always operates on the top of the shared stack. A plugin that wants to skip CODAP entries and undo only its own actions would need to implement that filtering internally and use `undoAction`/`redoAction` messages directly rather than `undoButtonPress`.
