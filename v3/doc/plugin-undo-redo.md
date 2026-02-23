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

### The Interleaving Question in Standalone Mode

While DI API mutations don't create undo entries, **user-triggered CODAP actions do**. In standalone mode, the CODAP toolbar is hidden, but the user can still interact directly with CODAP tiles (graphs, tables, etc.). These interactions create normal undo entries with MST patches on CODAP's undo stack.

If plugin undo entries share CODAP's undo stack, they interleave with user-triggered entries. Consider this scenario where the user clicks undo in the plugin:

1. Plugin does something → plugin entry pushed (stack: [P1])
2. User changes a graph setting → CODAP entry pushed (stack: [P1, C1])
3. Plugin does something → plugin entry pushed (stack: [P1, C1, P2])
4. User clicks undo in plugin → `undoButtonPress` → pops P2, sends `undoAction` to plugin
5. User clicks undo again → `undoButtonPress` → pops C1, undoes graph change
6. User clicks undo again → `undoButtonPress` → pops P1, sends `undoAction` to plugin

**This is chronologically correct undo behavior.** The most recent action gets undone first, regardless of whether it was a plugin or CODAP action. From the user's perspective, this is exactly right.

The shared stack approach works well for the user experience. The real concerns are about **plugin-side handling**:

1. **Plugin internal state sync.** If the plugin maintains its own internal undo stack and eagerly pops from it every time it sends `undoButtonPress` (before knowing the result), it will pop a plugin entry at step 5 when CODAP actually undid a graph change. The plugin's internal state gets out of sync. This only matters if the plugin eagerly pops its own stack rather than waiting for `undoAction`.

2. **No `undoAction` callback for CODAP entries.** At step 5, the plugin sent `undoButtonPress` and gets back `{success: true, canUndo, canRedo}`, but it does NOT receive an `undoAction` callback (because a CODAP entry was undone, not a plugin entry). If the plugin assumes every `undoButtonPress` will result in an `undoAction` callback, it will be confused.

3. **`canUndo`/`canRedo` semantics.** The shared stack's `canUndo` reflects ALL actions (plugin + CODAP). The plugin might show its undo button as enabled when the only remaining undo entry is a CODAP graph change, not a plugin action. This is arguably correct (the user CAN undo something) but might surprise a plugin that thinks `canUndo` means "I have plugin actions to undo."

**If the plugin handles these cases correctly, the shared stack approach works and shadow counters are unnecessary.** If it doesn't, shadow counters paper over the problem but at the cost of making CODAP tile changes permanently non-undoable in standalone mode (since user-triggered CODAP actions would sit on a stack with no UI to access them).

In **external/embedded mode**, interleaving is unambiguously correct — plugin actions and CODAP actions share a unified undo stack, and the user interacts with undo through CODAP's toolbar.

### Standalone vs External Mode: One or Two Code Paths?

V2 uses a single code path for both modes. V3 can likely do the same, **provided the plugin correctly handles the interleaving edge cases** described above.

- **Single code path (shared stack)**: Both modes use CODAP's undo stack. `undoableActionPerformed` creates a custom undo entry. `undoButtonPress`/`redoButtonPress` call `document.undoLastAction()`/`document.redoLastAction()`. In standalone mode, the user interacts with undo through the plugin's UI; in external mode, through CODAP's toolbar. The interleaving of plugin and CODAP entries is chronologically correct in both modes.

- **Two code paths (shadow counters for standalone)**: Standalone mode uses per-plugin shadow counters, keeping plugin undo completely separate from CODAP's stack. External mode uses the shared stack. This avoids the plugin-side handling concerns but introduces a tradeoff: user-triggered CODAP tile changes become permanently non-undoable in standalone mode, since they sit on a CODAP undo stack that has no accessible UI.

**Recommendation**: Start with the single code path (shared stack) approach for both modes. This is simpler to implement, matches V2 behavior, and provides chronologically correct undo. If plugin testing reveals that the plugin doesn't handle the interleaving edge cases correctly, the shadow counter approach can be added as a fallback for standalone mode. The key question to resolve is how Building Models handles `undoButtonPress` responses when a non-plugin action was undone (see [Open Questions](#open-questions)).

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

Implement a single code path using CODAP's undo stack for both standalone and external modes.

**Note on operation name:** The existing TODO in the handler references `undoButtonPressed` (with trailing "d"), but V2 and Building Models use `undoButtonPress` (no "d"). The implementation should accept the correct V2 name.

#### 1a. `undoableActionPerformed`: Create CODAP undo entry

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

#### 1b. `undoButtonPress` / `redoButtonPress`: Use CODAP's undo stack

- Call `document.undoLastAction()` / `document.redoLastAction()`
- Return `{ success: true, values: { canUndo, canRedo } }`

Note: if the top of the undo stack is a CODAP entry (not a plugin entry), the CODAP action will be undone and the plugin will NOT receive an `undoAction` callback. This is chronologically correct undo behavior. Whether the plugin handles this correctly is an open question (see [Open Questions](#open-questions)).

#### 1c. Fallback: Shadow counters for standalone mode (if needed)

If plugin testing reveals that the plugin doesn't handle the shared-stack edge cases (no `undoAction` callback when a CODAP entry is undone, `canUndo`/`canRedo` reflecting all actions), add a standalone-mode-specific code path:

- Maintain per-plugin undo/redo depth counters (two integers per plugin tile). No CODAP undo stack involvement.
- **`undoableActionPerformed`**: Increment undo counter, reset redo counter.
- **`undoButtonPress`**: Send `undoAction` directly to the plugin via `broadcastMessage`. Decrement undo counter, increment redo counter.
- **`redoButtonPress`**: Send `redoAction` directly. Increment undo counter, decrement redo counter.
- **Tradeoff**: User-triggered CODAP tile changes become permanently non-undoable in standalone mode.

#### 1d. Wire up response values

All operations should return `{ canUndo, canRedo }` from the document model. If shadow counters are added later for standalone mode, standalone responses would use the counters instead.

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
| `src/data-interactive/handlers/undo-change-notice-handler.ts` | Full handler implementation (single code path for both modes) |
| `src/models/history/tree-manager.ts` or `undo-store.ts` | May need extension for purely custom entries |
| `src/models/document/document.ts` | Access to `canUndo`/`canRedo` for responses |
| `src/models/history/with-custom-undo-redo.ts` | May need adaptation for no-MST-patch entries |
| `src/data-interactive/handlers/all-cases-handler.ts` | Remove undo strings from `delete` operation |
| New: observer for undo state change notifications | Proactive `clearUndo`/`clearRedo` broadcasts |

---

## Resolved Questions

1. **Should plugin-triggered data mutations (create/update/delete cases via API) also be undoable?** **No.** V3 DI handlers already call `applyModelChange` without undo strings, which routes through `withoutUndo()`. This is the correct behavior — plugin-triggered mutations are one half of a logical action whose undo is managed by the plugin itself. Recording them separately would break the undo model. This matches V2's `retainUndo = true` behavior.

2. **Does the implementation need separate code paths for standalone vs external mode?** **Probably not.** When plugin and CODAP entries interleave on a shared stack, the undo order is chronologically correct — the most recent action is undone first, regardless of source. The interleaving is not a flaw from the user's perspective. The potential issues are plugin-side: whether the plugin handles `undoButtonPress` responses where no `undoAction` is sent back (because a CODAP entry was undone), and whether it correctly interprets `canUndo`/`canRedo` as reflecting all actions. V3 should start with a single code path matching V2, and only add shadow counters for standalone mode if plugin testing reveals problems.

## Design Rationale: Shared Stack vs Shadow Counters

### Evolution of this analysis

This analysis went through several revisions:

1. **First version**: Concluded V3 could use a single code path (shared stack) for both modes, matching V2.
2. **Second revision**: Identified the "interleaving problem" — plugin and CODAP entries share a stack, so `undoButtonPress` might undo a CODAP entry instead of a plugin entry. Concluded shadow counters were needed for standalone mode.
3. **Third revision (current)**: Realized the interleaving is actually **chronologically correct undo behavior**. The most recent action is undone first, regardless of source. The real concerns are plugin-side, not CODAP-side.

### The interleaving is not a problem for the user

When plugin and CODAP actions interleave on a shared undo stack, the undo order is chronological: the most recent action is always undone first. This is correct. A user who changes a graph setting after a plugin action would expect "undo" to revert the graph change first, then the plugin action — which is exactly what happens.

### The real concerns are plugin-side

The shared stack raises three concerns about how the **plugin** handles edge cases:

1. **Plugin internal state sync**: If the plugin eagerly pops its own internal undo stack on every `undoButtonPress` (before receiving the result), it will get out of sync when CODAP undoes a CODAP entry instead of sending `undoAction`.

2. **Missing `undoAction` callback**: When `undoButtonPress` causes a CODAP entry to be undone, the plugin does NOT receive an `undoAction` callback. If the plugin assumes every `undoButtonPress` results in `undoAction`, it will be confused.

3. **`canUndo`/`canRedo` scope**: The shared stack's `canUndo`/`canRedo` reflect all actions (plugin + CODAP). The plugin might show its undo button as enabled when the only remaining entry is a CODAP change.

### Shadow counters as a fallback

If the plugin (specifically Building Models/SageModeler) doesn't handle these cases correctly, shadow counters can be added as a standalone-mode-specific fallback. However, shadow counters have their own tradeoff: user-triggered CODAP tile changes become permanently non-undoable in standalone mode, since they sit on a CODAP undo stack with no accessible UI.

### Debunked concerns

Two earlier concerns about the shared-stack approach turned out to be unfounded:

1. ~~DI API mutations would corrupt the undo stack~~ — V3 DI handlers already call `applyModelChange` without undo strings, which routes through `withoutUndo()`. Plugin-triggered mutations do not create undo entries.
2. ~~Plugin actions should not appear on CODAP's undo stack~~ — In standalone mode, CODAP's undo UI is hidden. Plugin entries on the stack would be invisible to the user.

## Open Questions

1. **How does Building Models handle `undoButtonPress` when a non-plugin action is undone?** This is the critical question for deciding between shared stack and shadow counters. Specifically:
   - Does Building Models eagerly pop its own internal undo stack on `undoButtonPress`, or does it wait for `undoAction`?
   - Does it expect an `undoAction` callback on every `undoButtonPress`, or does it handle the case where no callback arrives?
   - Does it use `canUndo`/`canRedo` from the response, or does it track these independently?

   If Building Models handles these cases correctly (or if interleaved CODAP actions are rare enough in practice), the shared stack approach works and shadow counters are unnecessary.

2. **Should `withCustomUndoRedo` be extended, or should a new mechanism be created** for purely side-effect-based undo entries that produce no MST patches?

3. **How should the proactive notifications be scoped?** V2 broadcasts `clearUndo`/`clearRedo` to all plugins. Should V3 do the same, or only to plugins that have registered undoable actions?
