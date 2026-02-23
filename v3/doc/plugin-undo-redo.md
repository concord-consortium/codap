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

### Standalone vs External Undo Modes

V2 supports two undo modes, controlled by the `?standalone=<name>` URL parameter:

- **Standalone mode** (`?standalone=SageModeler`): CODAP reports `standaloneUndoModeAvailable: true` to the plugin. The CODAP toolbar is hidden. The plugin owns the undo UX — only the plugin triggers undo/redo via `undoButtonPress`/`redoButtonPress`.
- **External/embedded mode** (default): CODAP reports `externalUndoAvailable: true`. CODAP's toolbar is visible and its undo/redo buttons are functional.

**Critically, `handleUndoChangeNotice` has no mode-specific branching.** The same code path handles both modes. This works because:

1. **DI API mutations don't interfere with the undo stack.** Plugin-triggered data mutations (create/update/delete cases) go through `context.applyChange()` directly — they are NOT wrapped in `DG.Command` objects. The `shouldRetainUndo = true` flag on data context operations prevents `DG.UndoHistory.documentWasChanged()` from clearing the undo stacks.

2. **The only undo entry is from `registerUndoChangeNotice`.** The `DG.Command` created for `undoableActionPerformed` has an empty `execute()` and message-sending callbacks for undo/redo. There are no competing entries from DI API mutations.

3. **In standalone mode, CODAP's undo UI is inaccessible.** The toolbar height is 0 (`kToolbarHeight = DG.STANDALONE_MODE ? 0 : 66`), so the user cannot accidentally trigger CODAP undo from the UI. Whether plugin actions sit on CODAP's undo stack is invisible to the user.

### Key Files (V2)

- `apps/dg/models/command.js` — `DG.Command` template
- `apps/dg/controllers/undo_history.js` — `DG.UndoHistory` singleton (stacks, execute/undo/redo, notifications)
- `apps/dg/components/data_interactive/data_interactive_phone_handler.js` — `handleUndoChangeNotice` (lines 2298–2356), including `registerUndoChangeNotice`
- `apps/dg/components/game/game_controller.js` — `DG.sendCommandToDI` broadcasts to all plugins
- `apps/dg/core.js` — `STANDALONE_MODE` and `isStandaloneComponent()` detection

### Known V2 Limitations

1. **No async support**: Undo does not support asynchronous changes. If execute/undo/redo trigger async code that dirties the document, the undo stacks are cleared.
2. **Plugin removal**: If a plugin component is removed and re-added via undo, calling undo/redo on that component will likely fail because the plugin's undo stack would have been cleared.
3. **Fire-and-forget with error reporting**: If the plugin fails to undo/redo, an error alert is shown, but the undo history state has already been modified. There is no rollback mechanism.

---

## V3 Current State

### What Exists

- **Full undo/redo infrastructure** via `TreeManager`/`UndoStore`/`HistoryEntry` using MST JSON patches
- **`withCustomUndoRedo`** mechanism for registering non-patch-based undo/redo (used for things like sort)
- **`withoutUndo`** mechanism for applying changes without creating undo entries
- **`undoChangeNotice` handler is registered but stubbed** — returns `"not implemented (yet)"`
- **`externalUndoAvailable`** and **`standaloneUndoModeAvailable`** are already reported to plugins in `interactiveFrame` GET responses (driven by `uiState.standaloneMode`)
- **Translation strings** for `DG.Undo/Redo.interactiveUndoableAction` exist in all locales
- **`broadcastMessage`** infrastructure works for sending messages to specific plugins via `targetTileId`

### DI API Mutations Already Bypass Undo

A critical finding for the implementation: V3 DI API handlers call `applyModelChange()` without providing `undoStringKey`/`redoStringKey`. When undo strings are omitted, `AppHistoryService.handleApplyModelChange()` automatically calls `withoutUndo()`:

```typescript
// app-history-service.ts
if (undoStringKey != null && redoStringKey != null) {
  withUndoRedoStrings(undoStringKey, redoStringKey)
} else {
  withoutUndo({ noDirty })
}
```

This means plugin-triggered data mutations (create cases, update cases, delete cases, etc.) do NOT create undo entries. The mutations are applied and persisted in the document history (for autosave), but they don't appear on the undo stack. This is functionally equivalent to V2's `retainUndo = true` behavior.

**Note:** `all-cases-handler.ts` (delete all cases) is the sole exception — it passes undo strings. This appears to be a bug, inconsistent with the established pattern for DI handlers. It should be fixed to omit undo strings like every other DI handler.

### Why a Single Code Path Works

Because V3 DI API mutations already bypass undo (just like V2), and because CODAP's undo UI is hidden in standalone mode (just like V2), the V3 implementation does **not** need separate code paths for standalone vs external mode. The same handler logic works for both:

- `undoableActionPerformed` creates an undo entry with plugin message callbacks
- `undoButtonPress` triggers undo (which pops the entry and messages the plugin)
- DI API mutations stay off the undo stack regardless of mode
- In standalone mode, the user never sees CODAP's undo stack, so plugin entries on it are harmless

### What's Missing

1. **The `undoChangeNotice` handler implementation** — all three operations are stubbed
2. **Custom undo/redo entry creation** for plugin actions (history entries with no MST patches, only custom callbacks)
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
| `src/models/history/app-history-service.ts` | Routes `applyModelChange` to undo or `withoutUndo` based on undo strings |
| `src/models/history/without-undo.ts` | `withoutUndo` — suppresses undo recording |
| `src/models/document/document.ts` | `canUndo`/`canRedo` views, `undoLastAction`/`redoLastAction` |
| `src/components/web-view/web-view-model.ts` | `broadcastMessage` to plugin iframe |
| `src/models/document/document-content.ts` | `broadcastMessage` across all tiles |
| `src/data-interactive/handlers/interactive-frame-handler.ts` | Reports `externalUndoAvailable` / `standaloneUndoModeAvailable` |

---

## V3 Implementation Plan

### Phase 1: Core `undoChangeNotice` Handler

#### 1a. Implement `undoButtonPress` / `redoButtonPress` (simplest, no custom undo needed)

In `src/data-interactive/handlers/undo-change-notice-handler.ts`:

- Access the document model (via `appState.document` or through the resources)
- For `undoButtonPress`: call `document.undoLastAction()`
- For `redoButtonPress`: call `document.redoLastAction()`
- Return `{ success: true, values: { canUndo, canRedo } }`

**Note on operation name:** The existing TODO in the handler references `undoButtonPressed` (with trailing "d"), but V2 and Building Models use `undoButtonPress` (no "d"). The implementation should accept the correct V2 name.

#### 1b. Implement `undoableActionPerformed` (the main feature)

When a plugin says it did something undoable:

1. Identify the originating plugin's tile ID from `resources.interactiveFrame`
2. Use `withCustomUndoRedo` (or a similar mechanism) to register a history entry with:
   - **Custom undo handler**: Uses `broadcastMessage` with `targetTileId` to send `{action: 'notify', resource: 'undoChangeNotice', values: {operation: 'undoAction'}}` to the originating plugin
   - **Custom redo handler**: Same but with `{operation: 'redoAction'}`
3. The entry should use the existing `DG.Undo.interactiveUndoableAction` / `DG.Redo.interactiveUndoableAction` strings
4. Return `{ success: true, values: { canUndo, canRedo } }`

**Key implementation challenge**: `withCustomUndoRedo` currently works within the context of an `applyModelChange` call. Plugin undo entries don't modify MST state — they're purely side-effect-based (send a message to an iframe). The implementation needs to either:

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

### Phase 4: Bug Fix

- **Remove undo strings from `all-cases-handler.ts`**: The `delete` operation passes `undoStringKey`/`redoStringKey`, making it the only DI handler that creates undo entries for plugin-triggered mutations. This is inconsistent with the established pattern and should be fixed.

### Files to Modify

| File | Changes |
|---|---|
| `src/data-interactive/handlers/undo-change-notice-handler.ts` | Full handler implementation |
| `src/models/history/tree-manager.ts` or `undo-store.ts` | May need extension for purely custom entries |
| `src/models/document/document.ts` | Access to `canUndo`/`canRedo` for responses |
| `src/models/history/with-custom-undo-redo.ts` | May need adaptation for no-MST-patch entries |
| `src/data-interactive/handlers/all-cases-handler.ts` | Remove undo strings from `delete` operation |
| New: observer for undo state change notifications | Proactive `clearUndo`/`clearRedo` broadcasts |

---

## Resolved Questions

1. **Should plugin-triggered data mutations (create/update/delete cases via API) also be undoable?** **No.** V3 DI handlers already call `applyModelChange` without undo strings, which routes through `withoutUndo()`. This is the correct behavior — plugin-triggered mutations are one half of a logical action whose undo is managed by the plugin itself. Recording them separately would break the undo model. This matches V2's `retainUndo = true` behavior.

2. **Does the implementation need separate code paths for standalone vs external mode?** **No.** V2 uses a single code path for both modes. V3 can do the same because: (a) DI API mutations already bypass undo in both modes, and (b) in standalone mode, CODAP's undo stack is hidden from the user, so plugin entries on it are harmless. The mode distinction only affects what flags the plugin receives (`standaloneUndoModeAvailable` vs `externalUndoAvailable`) and whether CODAP's toolbar is visible — neither is the handler's concern.

## Considered Alternative: Shadow Counters

An alternative approach was proposed in the CODAP-1127 spec (R3) for standalone mode: instead of creating CODAP undo entries, CODAP would maintain two integers (undo depth, redo depth) as "shadow counters." On `undoableActionPerformed`, increment the undo counter. On `undoButtonPress`, send `undoAction` directly to the plugin and adjust counters — no CODAP undo system involvement at all.

This approach was motivated by two concerns:

1. **DI API mutations would corrupt the undo stack** by creating interleaved undo entries alongside plugin entries.
2. **Plugin actions should not appear on CODAP's undo stack** in standalone mode.

Both concerns turned out to be unfounded:

1. V3 DI handlers already call `applyModelChange` without undo strings, which routes through `withoutUndo()`. Plugin-triggered mutations do not create undo entries. This is equivalent to V2's `retainUndo = true` behavior.
2. In standalone mode, CODAP's undo UI is hidden and inaccessible. Whether plugin entries sit on CODAP's undo stack has no user-visible effect.

The shadow counter approach would also introduce a second code path (branching on standalone vs external mode) that V2 does not need. V2 uses a single mode-agnostic handler, and V3 can do the same.

For these reasons, the recommended approach follows V2: use CODAP's undo system for both modes, with `withCustomUndoRedo` (or equivalent) to register plugin undo/redo callbacks. The shadow counter approach is not needed.

## Open Questions

1. **Should `withCustomUndoRedo` be extended, or should a new mechanism be created** for purely side-effect-based undo entries that produce no MST patches?

2. **How should the proactive notifications be scoped?** V2 broadcasts `clearUndo`/`clearRedo` to all plugins. Should V3 do the same, or only to plugins that have registered undoable actions?
