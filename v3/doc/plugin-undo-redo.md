# Plugin Undo/Redo: V2 Analysis & V3 Implementation Plan

## V2 Plugin Undo/Redo: How It Works

### Overview

V2's undo system is built around `DG.Command` objects pushed onto `DG.UndoHistory`'s undo/redo stacks. Each command has `execute()`, `undo()`, and `redo()` methods. For plugin undo/redo, CODAP acts as a **relay** — it doesn't know what the plugin did, it just records that *something undoable happened* and stores callbacks that tell the plugin to undo/redo its own state.

### The Protocol

**Plugin → CODAP (3 operations via `notify` on `undoChangeNotice`):**

| Operation | Meaning |
|---|---|
| `undoableActionPerformed` | "I just did something undoable" (with optional `logMessage`) |
| `undoButtonPress` | "The user clicked my undo button — please undo" |
| `redoButtonPress` | "The user clicked my redo button — please redo" |

**CODAP → Plugin (sent during undo/redo execution):**

| Operation | Meaning |
|---|---|
| `undoAction` | "Please undo your last action" |
| `redoAction` | "Please redo your last undone action" |
| `clearUndo` | "The undo stack was cleared" (with `canUndo`/`canRedo`) |
| `clearRedo` | "The redo stack was cleared" (with `canUndo`/`canRedo`) |

Every response to `undoChangeNotice` includes `{ canUndo, canRedo }` so the plugin can update its own UI.

### The Core Mechanism

When a plugin sends `undoableActionPerformed`, CODAP's `registerUndoChangeNotice` creates a `DG.Command` and pushes it onto the undo stack:

- **`execute()`**: Empty — the plugin already performed the action
- **`undo()`**: Sends `{operation: "undoAction"}` back to the originating plugin via iframe-phone
- **`redo()`**: Sends `{operation: "redoAction"}` back to the originating plugin via iframe-phone

The plugin must respond with `{success: true}` or `{success: false}`. On failure, CODAP shows an error alert.

### Key Files (V2)

- `apps/dg/models/command.js` — `DG.Command` template
- `apps/dg/controllers/undo_history.js` — `DG.UndoHistory` singleton (stacks, execute/undo/redo, notifications)
- `apps/dg/components/data_interactive/data_interactive_phone_handler.js` — `handleUndoChangeNotice` (lines 2298–2356), including `registerUndoChangeNotice`
- `apps/dg/components/game/game_controller.js` — `DG.sendCommandToDI` broadcasts to all plugins

### Known V2 Limitations

1. **No async support**: Undo does not support asynchronous changes. If execute/undo/redo trigger async code that dirties the document, the undo stacks are cleared.
2. **Plugin removal**: If a plugin component is removed and re-added via undo, calling undo/redo on that component will likely fail because the plugin's undo stack would have been cleared.
3. **Fire-and-forget with error reporting**: If the plugin fails to undo/redo, an error alert is shown, but the undo history state has already been modified. There is no rollback mechanism.

---

## V3 Current State

### What Exists

- **Full undo/redo infrastructure** via `TreeManager`/`UndoStore`/`HistoryEntry` using MST JSON patches
- **`withCustomUndoRedo`** mechanism for registering non-patch-based undo/redo (used for things like sort)
- **`undoChangeNotice` handler is registered but stubbed** — returns `"not implemented (yet)"`
- **`externalUndoAvailable`** is already reported to plugins in `interactiveFrame` GET responses
- **Translation strings** for `DG.Undo/Redo.interactiveUndoableAction` exist in all locales
- **`broadcastMessage`** infrastructure works for sending messages to specific plugins via `targetTileId`

### What's Missing

1. **The `undoChangeNotice` handler implementation** — all three operations are stubbed
2. **Custom undo/redo entry creation** for plugin actions
3. **Sending `undoAction`/`redoAction` messages back** to the originating plugin during undo/redo
4. **Proactive `clearUndo`/`clearRedo` notifications** when the undo stack changes
5. **Returning `canUndo`/`canRedo`** in handler responses

### Key V3 Files

| File | Role |
|---|---|
| `src/data-interactive/handlers/undo-change-notice-handler.ts` | Stubbed handler |
| `src/models/history/tree-manager.ts` | Central undo/redo coordinator |
| `src/models/history/undo-store.ts` | Undo/redo stack management |
| `src/models/history/with-custom-undo-redo.ts` | Custom (non-patch) undo/redo registration |
| `src/models/history/apply-model-change.ts` | `applyModelChange` action |
| `src/models/document/document.ts` | `canUndo`/`canRedo` views, `undoLastAction`/`redoLastAction` |
| `src/components/web-view/web-view-model.ts` | `broadcastMessage` to plugin iframe |
| `src/models/document/document-content.ts` | `broadcastMessage` across all tiles |
| `src/data-interactive/handlers/interactive-frame-handler.ts` | Reports `externalUndoAvailable` |

---

## V3 Implementation Plan

### Phase 1: Core `undoChangeNotice` Handler

#### 1a. Implement `undoButtonPress` / `redoButtonPress` (simplest, no custom undo needed)

In `src/data-interactive/handlers/undo-change-notice-handler.ts`:

- Access the document model (via `appState.document` or through the resources)
- For `undoButtonPress`: call `document.undoLastAction()`
- For `redoButtonPress`: call `document.redoLastAction()`
- Return `{ success: true, values: { canUndo, canRedo } }`

#### 1b. Implement `undoableActionPerformed` (the main feature)

This is the most complex piece. When a plugin says it did something undoable:

1. Identify the originating plugin's tile ID from `resources.interactiveFrame`
2. Use `withCustomUndoRedo` (or a similar mechanism) to register a history entry with:
   - **Custom undo handler**: Uses `broadcastMessage` with `targetTileId` to send `{action: 'notify', resource: 'undoChangeNotice', values: {operation: 'undoAction'}}` to the originating plugin
   - **Custom redo handler**: Same but with `{operation: 'redoAction'}`
3. The entry should use the existing `DG.Undo.interactiveUndoableAction` / `DG.Redo.interactiveUndoableAction` strings
4. Return `{ success: true, values: { canUndo, canRedo } }`

**Key challenge**: `withCustomUndoRedo` currently works within the context of an `applyModelChange` call. Plugin undo entries don't modify MST state — they're purely side-effect-based (send a message to an iframe). The implementation needs to either:

- Create a no-op `applyModelChange` that produces no patches but registers custom undo/redo, OR
- Extend the history system to support purely custom entries

#### 1c. Wire up response values

All three operations should return `{ canUndo, canRedo }` from the document model.

### Phase 2: Proactive Notifications

#### 2a. Observe undo/redo state changes

Add a MobX reaction (or similar) that watches `document.canUndo` and `document.canRedo`. When either changes (particularly when stacks are cleared), broadcast `{action: 'notify', resource: 'undoChangeNotice', values: {operation: 'clearUndo'|'clearRedo', canUndo, canRedo}}` to all plugins.

This could be implemented:

- In the `DocumentModel` or `TreeManager` as a side effect
- Or as a standalone observer set up during document initialization

### Phase 3: Testing & Edge Cases

- **Plugin removed and re-added**: If the plugin tile is destroyed, undo entries referencing it should handle the missing tile gracefully (show error or skip)
- **Multiple plugins**: Each plugin's undo entries should only send messages to the originating plugin, not all plugins
- **Async concerns**: Plugin responses to `undoAction`/`redoAction` are async (callback-based). Need to handle failures gracefully
- **Plugin response handling**: If a plugin responds with `{success: false}`, show an error notification (matching V2 behavior)

### Files to Modify

| File | Changes |
|---|---|
| `src/data-interactive/handlers/undo-change-notice-handler.ts` | Full handler implementation |
| `src/models/history/tree-manager.ts` or `undo-store.ts` | May need extension for purely custom entries |
| `src/models/document/document.ts` | Access to `canUndo`/`canRedo` for responses |
| `src/models/history/with-custom-undo-redo.ts` | May need adaptation for no-MST-patch entries |
| New: observer for undo state change notifications | Proactive `clearUndo`/`clearRedo` broadcasts |

---

## Open Questions

1. **Should plugin-triggered data mutations (create/update/delete cases via API) also be undoable?** Currently most handler actions call `applyModelChange` without undo strings. This is a separate concern from the `undoChangeNotice` mechanism but related to the overall plugin undo story.

2. **Should `withCustomUndoRedo` be extended, or should a new mechanism be created** for purely side-effect-based undo entries that produce no MST patches?

3. **How should the proactive notifications be scoped?** V2 broadcasts `clearUndo`/`clearRedo` to all plugins. Should V3 do the same, or only to plugins that have registered undoable actions?
