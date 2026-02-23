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

### The Interleaving Problem in Standalone Mode

While DI API mutations don't create undo entries, **user-triggered CODAP actions do**. In standalone mode, the CODAP toolbar is hidden, but the user can still interact directly with CODAP tiles (graphs, tables, etc.). These interactions create normal undo entries with MST patches on CODAP's undo stack.

If plugin undo entries share CODAP's undo stack, they interleave with user-triggered entries. For example:

1. Plugin performs an undoable action → plugin entry pushed to CODAP stack
2. User changes a graph setting → CODAP entry pushed to stack
3. Plugin sends `undoButtonPress` → `document.undoLastAction()` pops the **graph change**, not the plugin action

The plugin never receives `undoAction` — the wrong thing gets undone. This interleaving problem exists in V2 as well (V2's `handleUndoChangeNotice` shares the same `DG.UndoHistory` stack), but it likely goes unnoticed in practice because SageModeler controls most of the UX and direct user manipulation of CODAP tiles is rare.

For V3, the **shadow counter approach** solves this cleanly for standalone mode by keeping plugin undo tracking completely separate from CODAP's undo stack (see [Standalone vs External Mode: Two Code Paths](#standalone-vs-external-mode-two-code-paths) below).

In **external/embedded mode**, interleaving is the correct behavior — plugin actions and CODAP actions share a unified undo stack, and the user interacts with undo through CODAP's toolbar.

### Standalone vs External Mode: Two Code Paths

Despite V2 using a single code path, V3 should use **two code paths** to correctly handle the interleaving problem:

- **Standalone mode** (`uiState.standaloneMode`): Use shadow counters. Plugin undo entries are NOT placed on CODAP's undo stack. `undoButtonPress` sends `undoAction` directly to the plugin and adjusts counters. User-triggered CODAP actions remain on CODAP's stack independently. The two undo histories never interfere with each other.

- **External/embedded mode**: Use CODAP's undo stack (the approach from the original analysis). `undoableActionPerformed` creates a custom undo entry on CODAP's stack. `undoButtonPress` calls `document.undoLastAction()`. Interleaving of plugin and CODAP entries is intentional in this mode — they share a unified undo experience.

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

The handler should branch on the undo mode early:

```
if (standalone mode for this plugin's tile) → shadow counter path
else → CODAP undo entry path
```

**Note on operation name:** The existing TODO in the handler references `undoButtonPressed` (with trailing "d"), but V2 and Building Models use `undoButtonPress` (no "d"). The implementation should accept the correct V2 name.

#### 1a. Standalone mode: Shadow counters

Maintain per-plugin undo/redo depth counters (two integers per plugin tile). No CODAP undo stack involvement.

- **`undoableActionPerformed`**: Increment undo counter, reset redo counter. Return `{ success: true, values: { canUndo: true, canRedo: false } }`.
- **`undoButtonPress`**: Send `{action: 'notify', resource: 'undoChangeNotice', values: {operation: 'undoAction'}}` directly to the originating plugin via `broadcastMessage` with `targetTileId`. Wait for the plugin's callback. Decrement undo counter, increment redo counter. Return updated `{ canUndo, canRedo }`.
- **`redoButtonPress`**: Same as above but with `{operation: 'redoAction'}`. Increment undo counter, decrement redo counter.

#### 1b. External mode: CODAP undo entries

Use CODAP's undo system. When a plugin says it did something undoable:

1. Identify the originating plugin's tile ID from `resources.interactiveFrame`
2. Use `withCustomUndoRedo` (or a similar mechanism) to register a history entry with:
   - **Custom undo handler**: Uses `broadcastMessage` with `targetTileId` to send `{action: 'notify', resource: 'undoChangeNotice', values: {operation: 'undoAction'}}` to the originating plugin
   - **Custom redo handler**: Same but with `{operation: 'redoAction'}`
3. The entry should use the existing `DG.Undo.interactiveUndoableAction` / `DG.Redo.interactiveUndoableAction` strings
4. Return `{ success: true, values: { canUndo, canRedo } }`

For `undoButtonPress`/`redoButtonPress`:
- Call `document.undoLastAction()` / `document.redoLastAction()`
- Return `{ success: true, values: { canUndo, canRedo } }`

**Key implementation challenge**: `withCustomUndoRedo` currently works within the context of an `applyModelChange` call. Plugin undo entries don't modify MST state — they're purely side-effect-based (send a message to an iframe). The implementation needs to either:

- Create a no-op `applyModelChange` that produces no patches but registers custom undo/redo, OR
- Extend the history system to support purely custom entries

#### 1c. Wire up response values

All operations should return `{ canUndo, canRedo }`. In standalone mode, these come from the shadow counters. In external mode, they come from the document model.

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

2. **Does the implementation need separate code paths for standalone vs external mode?** **Yes.** Although V2 uses a single code path, that approach has an interleaving flaw: user-triggered CODAP actions (e.g., graph changes) create undo entries on the same stack as plugin entries. When the plugin sends `undoButtonPress`, `document.undoLastAction()` may pop a CODAP entry instead of the plugin's entry. V2 gets away with this because direct user manipulation of CODAP tiles is rare in SageModeler, but it's not architecturally correct. V3 should use shadow counters for standalone mode (keeping plugin undo separate from CODAP's stack) and CODAP undo entries for external mode (where interleaving is intentional).

## Design Rationale: Why Shadow Counters for Standalone Mode

An earlier version of this analysis concluded that V3 could use a single code path for both modes, matching V2. That conclusion was revised after identifying the **interleaving problem**: in standalone mode, user-triggered CODAP actions (graph changes, table edits, etc.) create undo entries on the same stack as plugin entries. When the plugin sends `undoButtonPress`, `document.undoLastAction()` may pop a user-triggered CODAP entry instead of the plugin's entry, undoing the wrong thing.

The shadow counter approach (from the CODAP-1127 spec) solves this by keeping plugin undo tracking completely separate from CODAP's undo stack:

- Plugin actions are tracked by per-plugin integer counters, not CODAP undo entries
- `undoButtonPress` sends `undoAction` directly to the plugin and adjusts counters — CODAP's undo stack is never touched
- User-triggered CODAP actions remain on CODAP's own stack independently
- The two undo histories cannot interfere with each other

Note that two earlier concerns about the shared-stack approach turned out to be unfounded and are **not** the reason for choosing shadow counters:

1. ~~DI API mutations would corrupt the undo stack~~ — V3 DI handlers already call `applyModelChange` without undo strings, which routes through `withoutUndo()`. Plugin-triggered mutations do not create undo entries.
2. ~~Plugin actions should not appear on CODAP's undo stack~~ — In standalone mode, CODAP's undo UI is hidden. Plugin entries on the stack would be invisible to the user.

The actual reason is the interleaving of plugin entries with user-triggered CODAP entries on a shared stack. In **external mode**, this interleaving is correct and intentional (unified undo experience). In **standalone mode**, it causes the wrong action to be undone.

## Open Questions

1. **Should `withCustomUndoRedo` be extended, or should a new mechanism be created** for purely side-effect-based undo entries that produce no MST patches?

2. **How should the proactive notifications be scoped?** V2 broadcasts `clearUndo`/`clearRedo` to all plugins. Should V3 do the same, or only to plugins that have registered undoable actions?
