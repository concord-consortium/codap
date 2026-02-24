# SPIKE: SageModeler Compatibility in CODAP v3

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1127

**Repo**: https://github.com/concord-consortium/codap

**Status**: **In Development**

## Overview

This spike investigated what remains for CODAP v3 to run inside the SageModeler iframe stack (SageModeler → CFM → CODAP → Building Models plugin). The analysis covered URL parameters, plugin state persistence, undo/redo integration, CFM communication, the Data Interactive API surface used by Building Models, CloudFront deployment paths, and local development tooling.

**Findings**: Most of the integration surface is already implemented. The gaps are:

- **Blocker**: The `undoChangeNotice` handler (R3) is not implemented — Building Models requires it for undo/redo, and without it undo/redo buttons silently do nothing
- **Production deployment**: CloudFront routing and SageModeler URL construction (R7) have been updated — see [sage-modeler-site PR #211](https://github.com/concord-consortium/sage-modeler-site/pull/211)
- **Dev tooling**: A v3-compatible dev proxy (R8) has been implemented — see [sage-modeler-site PR #210](https://github.com/concord-consortium/sage-modeler-site/pull/210)

## Project Owner Overview

SageModeler embeds CODAP to display data tables, graphs, and other analysis tools alongside its system dynamics modeling interface. This spike assessed whether CODAP v3 can replace v2 in that role.

The good news is that nearly all of the integration surface already works in v3 — URL parameters, plugin state save/restore, file management, and the data API that Building Models uses to create datasets, attributes, and components. The one gap is undo/redo: Building Models routes all undo/redo operations through CODAP, and v3's handler for this isn't implemented yet. Until it is, undo and redo buttons in Building Models will silently fail when running against v3.

Production deployment routing has been updated ([sage-modeler-site PR #211](https://github.com/concord-consortium/sage-modeler-site/pull/211)) to support v3's different build structure.

A v3-compatible local development proxy has been implemented ([sage-modeler-site PR #210](https://github.com/concord-consortium/sage-modeler-site/pull/210)) that serves all four apps (SageModeler, CFM, CODAP v3, Building Models) from a single origin for testing and development.

## Background

SageModeler is a system dynamics modeling tool used in science education classrooms. It runs as a top-level application that embeds CODAP inside an iframe stack:

```
SageModeler (top-level app, https://sagemodeler.concord.org/app/)
  └─ Cloud File Manager (CFM) — manages file I/O and persistence
       └─ CODAP (v2 today) — data analysis platform
            └─ Building Models plugin — the modeling tool, loaded via `di` param
```

SageModeler constructs a CODAP URL with specific query parameters that alter CODAP's behavior — hiding UI chrome, enabling embedded iframe communication, and loading the Building Models plugin as the primary data interactive. A CloudFront distribution at `sagemodeler.concord.org` routes subfolders to different origins (CODAP via `/releases/`, Building Models via `/sage/`) to avoid cross-origin issues.

The current production URL looks like:
```
/releases/stable/static/dg/en/cert/index.html
  ?embeddedMode=yes
  &hideSplashScreen=yes
  &hideUndoRedoInComponent=yes
  &hideWebViewLoading=yes
  &inbounds=true
  &lang-override=en
  &saveSecondaryFileViaPostMessage=true
  &standalone=SageModeler
  &di=/sage/sagemodeler.html%3Fstandalone%3Dtrue
  &di-override=sage
```

Building Models communicates with CODAP via the Data Interactive API (iframe-phone RPC) and uses these key CODAP features:
- **Data contexts**: Creates "Sage Simulation" with parent/child collections
- **Attributes**: CRUD operations as model nodes are added/renamed/deleted
- **Cases/Items**: Creates simulation run data
- **Components**: Creates graphs, case tables, text tiles
- **interactiveFrame**: Sets plugin properties (preventBringToFront, cannotClose, etc.)
- **interactiveState**: Saves/restores full model graph state
- **undoChangeNotice**: Coordinates undo/redo between plugin and CODAP
- **logMessage**: Logs user actions

The goal of this spike is to identify what remains for CODAP v3 to fully support the SageModeler use case, estimate the work, and either fix it (if <2 days) or enumerate the gaps for future planning.

### Related Projects

This spec assumes all related projects are cloned from GitHub into sibling folders alongside the `codap` repo. Relative paths (e.g., `../building-models/`) reflect this layout.

| Project | Location | Branch | Deployed URL |
|---------|----------|--------|--------------|
| SageModeler | `../sage-modeler-site/` | main | `sagemodeler.concord.org/app/` |
| Cloud File Manager | `../cloud-file-manager/` | v1.9.x | `cloud-file-manager.concord.org/` |
| Building Models | `../building-models/` | main | `sagemodeler.concord.org/sage/` |
| CODAP v3 | `./v3/` | main | via `/releases/` |

## Requirements

### R1: URL Parameter Compatibility

All CODAP query parameters used by SageModeler must be supported in v3. Current analysis shows these are **all implemented**:

- `embeddedMode=yes` — Hides UI chrome, enables iframe-phone RPC (`url-params.ts:65-70`, `embedded-server.ts`)
- `hideSplashScreen=yes` — Suppresses startup splash (`url-params.ts:100-103`)
- `hideUndoRedoInComponent=yes` — Hides undo/redo in component title bars (`url-params.ts:105-109`, `ui-state.ts:106`)
- `hideWebViewLoading=yes` — Hides plugin loading backdrop (`url-params.ts:111-115`, `web-view.tsx:150`)
- `inbounds=true` — Constrains components to visible container with scaling (`url-params.ts:122-129`, `inbounds-scaling.ts`)
- `lang-override=en` — Sets locale (`url-params.ts:141-146`, `locale.ts:5`)
- `saveSecondaryFileViaPostMessage=true` — Handled by CODAP's bundled CFM instance; registers a PostMessageProvider that exports files to the parent frame. No CODAP code changes needed.
- `standalone=SageModeler` — Standalone plugin mode by name (`ui-state.ts:95-102`)
- `di=<url>` — Loads Building Models as data interactive (`url-params.ts:44-50`, `url-params.ts:252-264`)
- `di-override=sage` — Overrides saved plugin URLs containing "sage" (`url-params.ts:52-58`)

**Requirement**: Verify these all function correctly end-to-end in v3, not just that code paths exist. Baseline validation covered by the E2E Smoke Test; detailed per-parameter criteria deferred to test plan.

### R2: Plugin State Persistence

Building Models relies on CODAP to save and restore its full model graph via `interactiveState`. This **works in v3**:

- **Save**: `WebViewModel.prepareSnapshot()` calls `get interactiveState` and stores the result in the model's `state` property (`web-view-model.ts:188-207`)
- **Restore**: When the plugin connects and calls `get interactiveFrame`, the handler returns `savedState` from the model's `state` property (`interactive-frame-handler.ts:18,34`). Building Models reads `frame.values.savedState` to restore its graph.

Note: There is a TODO in `afterApplySnapshot()` (`web-view-model.ts:209-212`) about pushing state to plugins during undo/redo snapshot application. In standalone undo mode this is largely moot for Building Models — CODAP suppresses undo recording for DI mutations from the standalone plugin (see R3), so CODAP's snapshot-based undo won't have entries to apply for Building Models operations. Building Models handles its own undo/redo state internally via its UndoRedoManager and re-issued DI API calls. This TODO remains relevant for non-standalone plugins that use CODAP's external undo mode.

**Requirement**: Verify state save/restore round-trips correctly with Building Models in the full SageModeler stack. Baseline validation covered by the E2E Smoke Test (step 7); specific save paths and edge cases (state size, explicit save, multiple webview tiles) deferred to test plan.

### R3: Undo/Redo Integration — BLOCKER

Building Models sends `undoChangeNotice` notifications to coordinate undo/redo with CODAP. The v3 handler is **not implemented** (`undo-change-notice-handler.ts:4-6`). **This is a blocker for SageModeler.**

Since `standalone=SageModeler` makes v3 return `standaloneUndoModeAvailable: true`, Building Models enters standalone undo mode. However, Building Models **always routes undo/redo through CODAP** when `usingCODAP` is true — even in standalone mode. The flow is a round-trip:

1. User clicks undo → `graphStore.undo()` (`graph-store.ts:237-248`)
2. Since `usingCODAP=true` and `fromCODAP=false`, calls `sendUndoToCODAP()` (`codap-connect.ts:547-559`)
3. Sends `notify undoChangeNotice { operation: "undoButtonPress" }` to CODAP
4. CODAP is supposed to process it and call **back** to Building Models with `undoAction`
5. Building Models receives `undoAction` in its `codapRequestHandler` (`codap-connect.ts:734-759`) and executes `graphStore.undo(fromCODAP=true)` which runs the local UndoRedoManager

If v3's `undoChangeNotice` handler returns "not implemented", step 4 never happens and **undo/redo silently fails**.

Building Models also sends `undoableActionPerformed` after every user action (`undo-redo.ts:104`), which CODAP must track to know whether undo/redo is available.

**Requirement**: The `undoChangeNotice` handler must be implemented for standalone mode. It needs to handle these incoming notifications from Building Models (shadow counters are defined in the "Undo ownership model" section below):
- `undoableActionPerformed` — increment the undo shadow counter (do not create a CODAP undo entry)
- `undoButtonPress` / `redoButtonPress` — send `undoAction`/`redoAction` back to the plugin, wait for the plugin's callback, then adjust shadow counters and reply to the original notify with updated `canUndo`/`canRedo` (the reply must reflect post-operation state)

Additionally, CODAP must send these operations back to Building Models as part of the round-trip:
- `undoAction` / `redoAction` — tell Building Models to execute its local undo/redo
- `clearUndo` / `clearRedo` — tell Building Models to clear its undo/redo stacks (Building Models handles these in `codap-connect.ts:747-753`)

#### Undo ownership model

In standalone undo mode, **Building Models owns the entire undo stack** and is the source of truth for performing undo/redo. CODAP acts as a relay and bookkeeper — it receives `undoButtonPress`, sends back `undoAction`, and Building Models does all the actual work. However, CODAP must maintain **two shadow counters** (not a full undo stack) — one for undo depth, one for redo depth — so it can return accurate `canUndo`/`canRedo` values. Update rules:
- `undoableActionPerformed`: increment undo count, reset redo count to 0
- Successful `undoAction` callback: decrement undo count, increment redo count
- Successful `redoAction` callback: increment undo count, decrement redo count
- `clearUndo`: reset undo count to 0; `clearRedo`: reset redo count to 0

Guard: counters must never go below 0. If `undoButtonPress` arrives when undo count is already 0, CODAP should no-op (do not send `undoAction`) and return `{ success: true, values: { canUndo: false, canRedo: <current> } }`. Same for `redoButtonPress` when redo count is 0.

#### Why shadow counters (not MST / TreeManager)

CODAP v3 uses MobX-State-Tree (MST) with a TreeManager that records undo/redo snapshots for normal CODAP operations. We considered three approaches for tracking standalone plugin undo state, and chose shadow counters:

1. **TreeManager integration** — rejected. TreeManager records full MST snapshots for CODAP's own undo system. In standalone mode, Building Models owns the undo stack and re-issues DI API calls to bring CODAP's data state back in sync. If TreeManager also recorded undo entries for these DI mutations, there would be two systems competing over the same state — Building Models undoing via DI API calls while TreeManager independently snapshots and restores, producing incoherent results. This is exactly why the spec requires suppressing undo recording for standalone plugin DI requests.

2. **MST model properties** — rejected. Observable MST properties are serialized into saved documents and their mutations can trigger dirty state, undo recording, and MobX reactions. Undo bookkeeping is ephemeral session state that must not be persisted, must not mark the document dirty, and must not create its own undo entries.

3. **Two plain counters** — chosen. The only information CODAP needs is whether `canUndo` and `canRedo` — i.e., whether the plugin's undo and redo stacks are non-empty. Two integers are sufficient. They are ephemeral (reset on document load/reconnect), have no side effects, and are only read synchronously when forming a response. MST volatile state on the WebViewModel would also work (non-serialized, non-tracked), but plain counters are simpler and the implementation choice is left to the developer.

#### Prior art: plugin undo/redo analysis

A separate investigation of proper plugin undo/redo support in v3 (where CODAP's own undo system would natively understand plugin mutations) concluded that it would require modifications to "almost all" DI API handlers — far beyond the scope of this spike. The analysis identified fundamental tensions between action-based undo (what plugins do) and patch-based undo (what v3's TreeManager does), particularly around object ID stability when plugins recreate objects during undo. See: [Plugin Undo/Redo Analysis](https://docs.google.com/document/d/1RgUoAH09_MavH5TcafBkvvpk1-wzhbYmAsi-DZYtDYM/edit?tab=t.0).

This spec deliberately implements the **legacy standalone undo API** (option 1 from that analysis): replicate v2's relay behavior where Building Models owns the undo stack and CODAP acts as a pass-through. This is the pragmatic path — it unblocks SageModeler without requiring changes to Building Models or to the DI API handler architecture. The tradeoff is that it perpetuates a limited plugin undo API that other plugins could adopt, making it harder to move to a proper implementation later.

Building Models uses a command pattern (`UndoRedoManager`) where each command stores closures that embed DI API calls directly:

- **Execute** "add node": creates the node locally, then calls `_createMissingDataAttributes()` which issues a DI API CREATE to CODAP
- **Undo** "add node": calls `sendDeleteAttribute()` (DI API DELETE to CODAP), then removes the node locally
- **Redo**: re-runs execute, re-issuing the CREATE

This means Building Models' undo/redo operations **re-issue DI API calls** to bring CODAP's data state back in sync. CODAP does not need to (and must not) independently undo its own data mutations.

**Critical implementation constraint**: In standalone undo mode, all DI API requests from the standalone plugin's webview tile must be treated as non-undoable by CODAP, even if the underlying handler would normally mark them undoable. The scope is per-tile, keyed by the tile's `interactiveFrame` ID: CODAP knows which tile returned `standaloneUndoModeAvailable: true` in its `interactiveFrame` response, and suppresses undo recording for DI requests originating from that tile. (Every DI handler already receives the originating tile via `resources.interactiveFrame`, populated by `resolveResources()` in the request pipeline — no new plumbing is needed to identify the source tile.) Without this, when Building Models undoes "add node" (issuing a DI DELETE), TreeManager would record that DELETE as a new undoable action, creating an incoherent undo stack. This suppression is scoped to DI-sourced mutations only — any direct CODAP UI edits (e.g., editing table cells, resizing components) should remain undoable through CODAP's normal undo system if they are possible in this mode. **Autosave hazard**: `treeManager.revisionId` — the sole trigger for dirty state and autosave — is only updated inside `completeHistoryEntry()`, which is part of the undo/history recording pipeline (`tree-manager.ts:179-182`). This means `revisionId` is **coupled** to history entry creation, not to MST tree changes directly. If the suppression mechanism bypasses the history pipeline entirely (e.g., raw MST mutations without `applyModelChange`), then `revisionId` won't increment, dirty state won't propagate, and **autosave will silently break**. The safe path is v3's existing `withoutUndo()` mechanism: it creates a non-undoable history entry that still completes normally.

There are two cases for standalone plugin DI requests, distinguished by the plugin's `dirtyDocument` metadata:

- **Normal plugin actions** (user adds a node → plugin creates attribute, no `dirtyDocument` metadata or `dirtyDocument: true`): use `withoutUndo()` **without** `noDirty` → `revisionId` updates, document becomes dirty, autosave works
- **Undo/redo-triggered actions** (plugin undoes "add node" → sends DELETE with `meta: { dirtyDocument: false }`): use `withoutUndo()` **with** `noDirty: true` → `revisionId` does not update, document is not re-dirtied. This is correct because the undo operation may be reverting to the last-saved state, and the plugin is explicitly requesting no dirty. (Confirmed via v2 postMessage traces: Building Models sends `dirtyDocument: false` on DI API calls made during undo operations.)

Both cases suppress undo recording. The distinction is whether the document should be dirtied, which the plugin controls via its existing `dirtyDocument` metadata.

Note: v3's TODO comment in `undo-change-notice-handler.ts` uses `undoButtonPressed`/`redoButtonPressed` (with trailing "d"), but Building Models sends `"undoButtonPress"`/`"redoButtonPress"` (without "d"). The implementation must match what Building Models actually sends.

#### Response contract

**Plugin → CODAP** (`undoChangeNotice.notify`): Every response must include `canUndo`/`canRedo` status, matching the v2 contract: `{ success: true, values: { canUndo, canRedo } }`. This applies to responses for `undoableActionPerformed`, `undoButtonPress`, and `redoButtonPress`. On error, return `{ success: false, values: { error: "<message>" } }`. Unknown `operation` values should return `{ success: false, values: { error: "Unknown operation: <operation>" } }`. Details of error UX (alert vs. silent log) deferred to implementation spec.

**CODAP → plugin** (`undoAction`/`redoAction`/`clearUndo`/`clearRedo`): These are sent as DI API requests to the plugin via `broadcastMessage` with this payload shape:

```json
{ "action": "notify", "resource": "undoChangeNotice", "values": { "operation": "<operation>" } }
```

where `<operation>` is one of `undoAction`, `redoAction`, `clearUndo`, or `clearRedo`. CODAP must wait for the plugin's callback before adjusting its shadow counters — only update counts after the plugin confirms success. The plugin is expected to respond with `{ success: true }` or `{ success: false, values: { error: "<message>" } }`. If the plugin returns `{ success: false }`, CODAP should not adjust counters and should log the error.

#### When CODAP emits `clearUndo` / `clearRedo`

CODAP should send `clearUndo`/`clearRedo` to the plugin on document lifecycle transitions. The minimum set of triggers to implement first:
- After document load or replace (CFM `openedFile` event)
- When the interactive frame (re)connects (plugin sends initial `get interactiveFrame`)

On each of these events, CODAP must also reset both shadow counters to 0 to stay in sync with the plugin's cleared state. Additional triggers (e.g., new document creation) may be added during implementation.

#### Acceptance criteria

- After any undoable Building Models action, CODAP responds with `{ success: true, values: { canUndo: true, canRedo } }`
- Clicking undo in Building Models triggers the full round-trip: `undoButtonPress` → CODAP → `undoAction` → Building Models executes local undo (including DI API calls to revert CODAP state) → model visibly reverts one step
- Same for redo
- On document load/new/replace, CODAP sends `clearUndo`/`clearRedo` so Building Models disables stale undo/redo UI
- DI API mutations caused by Building Models do not create entries in CODAP's own undo history

### R4: V2 Document Compatibility — Low Priority

Plugin state is handled entirely through the standard plugin API (`get interactiveFrame` → `savedState`). Documents saved by v3 will store plugin state in the WebViewModel's `state` property, and Building Models will restore it on load via the API. No special v2-specific handling is needed for the SageModeler-in-v3 workflow.

**Requirement**: No action needed for this spike. V2→v3 document migration is a separate, general concern.

### R5: Embedded Mode / CFM PostMessage Communication — Implemented

There are two separate communication layers in the iframe stack, and both are implemented:

**1. CFM ↔ CODAP (file management)**: CFM is integrated as an npm dependency (`@concord-consortium/cloud-file-manager`). CODAP v3 fully implements the CFM event protocol in `handle-cfm-event.ts` (lines 22-223):

| Event Type | Purpose | Status |
|-----------|---------|--------|
| `connected` | CFM handshake, setup provider options | Implemented (line 30) |
| `ready` | CFM ready, hide splash screen | Implemented (line 48) |
| `getContent` | Request document snapshot for save | Implemented (line 53) |
| `willOpenFile` | About to open file | Implemented (line 70) |
| `openedFile` | File opened, load document | Implemented (line 79) |
| `savedFile` | File saved, verify revisionId | Implemented (line 179) |
| `sharedFile` / `unsharedFile` | Document sharing | Implemented (line 197-198) |

Additional CFM protocol messages:
- `cfm::iframedClientConnected` — sent from CFM's `app.tsx` (line 73-74) via `window.parent.postMessage()`
- `cfm::autosave` — handled by CFM client's postMessage listener, triggers `getContent` event
- `cfm::setDirty` — inner CFM sends this to the parent when dirty state changes.
  - **Propagation flow**: DI API mutation → MST tree change → TreeManager `revisionId` update → MobX reaction calls `cfm.client.dirty(true)` (`app-state.ts:170-172`) → `cfm::setDirty` sent to outer CFM
  - This works independently of the `undoChangeNotice` handler — any MST mutation triggers dirty state, regardless of whether the plugin passes `dirtyDocument: false`

AutoSave runs on 5-second intervals (`kCFMAutoSaveInterval`), with dirty state tracked via MobX reaction on `treeManager.revisionId` (`app-state.ts:169-174`).

**2. Parent window ↔ CODAP (embedded mode)**: The embedded server (`embedded-server.ts:29-95`) handles iframe-phone RPC for parent window communication. It sends `codap-present`, processes Data Interactive API requests from the parent, and broadcasts notifications. It is activated whenever `embeddedMode=yes` is set (`ui-state.ts:112`), so it initializes in the SageModeler stack. However, CFM (the parent in this stack) does not use iframe-phone RPC — it uses the `cfm::event` postMessage protocol instead. The embedded server is effectively idle in the SageModeler flow but does no harm.

**CFM version compatibility**: SageModeler uses CFM v1.9.x (deployed to `cloud-file-manager.concord.org`) as the **outer** wrapper that iframes CODAP. CODAP v3 includes CFM ~2.1.0-pre.18 as an npm dependency (the **inner** instance). These communicate via postMessage across the iframe boundary.

The core postMessage protocol (`cfm::getCommands`, `cfm::autosave`, `cfm::event`, `cfm::event:reply`, `cfm::setDirty`, `cfm::iframedClientConnected`) is **identical** between v1.9.x and master — no breaking changes. However, there are divergences to be aware of:

- **`requiresUserInteraction` event**: New in master, emitted before confirmation dialogs. The outer CFM (v1.9.x) doesn't emit this. Since this is fired internally within CODAP v3's CFM instance (not across the postMessage boundary), it should not cause issues.
- **New methods in master** (`replaceMenu`, `updateMenuBar`, `openLocalFileWithConfirmation`): Called by CODAP v3 on its own inner CFM instance. These don't cross the iframe boundary, so the outer v1.9.x CFM is unaffected.
- **MIME type library change**: v1.9.x uses `mime-types`, master uses `mime`. Different libraries but the inner/outer CFMs run in separate frames, so no conflict.

**Requirement**: No code changes needed for CFM protocol compatibility. The postMessage protocol is stable across versions. Verify end-to-end via the v3 dev proxy (see R8).

### R6: Building Models Data Interactive API Usage

Building Models uses these API resources that must all work in v3:

| Resource | Operations | Status |
|----------|-----------|--------|
| `interactiveFrame` | get, update, notify (indicateBusy/indicateIdle) | Implemented |
| `dataContext` | get, create | Implemented |
| `collection` | get, create | Implemented |
| `attribute` | create, update, delete | Implemented |
| `attributeList` | get | Implemented |
| `item` | create | Implemented |
| `caseCount` | get | Implemented |
| `caseByIndex` | get | Implemented |
| `allCases` | get | Implemented |
| `component` | create, update | Implemented |
| `componentList` | get | Implemented |
| `undoChangeNotice` | notify | **NOT IMPLEMENTED** |
| `logMessage` | notify | Implemented |
| `interactiveState` | get (CODAP requests plugin's state for save) | Implemented |
| `dataContextChangeNotice` | receive | Implemented |

**Requirement**: Verify each of these works correctly, not just that handlers are registered. Baseline validation covered by the E2E Smoke Test (steps 3–5); detailed per-resource checks deferred to test plan.

### R7: CloudFront / Deployment Path Compatibility — COMPLETE

Production deployment routing has been updated in [sage-modeler-site PR #211](https://github.com/concord-consortium/sage-modeler-site/pull/211). This covered CloudFront routing, asset base paths, SageModeler URL construction, and the default `codapUrl` template variable for v3's flat build structure.

### R8: Dev Proxy for Full-Stack Local Development — COMPLETE

A v3-compatible dev proxy has been implemented in [sage-modeler-site PR #210](https://github.com/concord-consortium/sage-modeler-site/pull/210). The new proxy (`devproxy3`) serves all four apps from a single origin with CODAP v3 hot reload support, alongside the existing v2 proxy which remains untouched.

## Technical Notes

### Key v3 Files

| File | Purpose |
|------|---------|
| `v3/src/utilities/url-params.ts` | URL parameter parsing and processing |
| `v3/src/models/ui-state.ts` | UI state management (standalone, embedded, etc.) |
| `v3/src/lib/embedded-mode/embedded-server.ts` | Parent iframe communication |
| `v3/src/components/web-view/web-view-model.ts` | Plugin tile model (state persistence) |
| `v3/src/components/web-view/use-data-interactive-controller.ts` | Plugin iframe-phone setup |
| `v3/src/data-interactive/handlers/` | All Data Interactive API handlers |
| `v3/src/data-interactive/handlers/undo-change-notice-handler.ts` | Undo/redo (TODO) |

### SageModeler Dev Proxy

The v3-compatible dev proxy was implemented in [sage-modeler-site PR #210](https://github.com/concord-consortium/sage-modeler-site/pull/210). See that PR and the sage-modeler-site README for setup and usage details.

### Building Models State Save/Restore

Building Models restores its state from `interactiveFrame.values.savedState` (`codap-connect.ts:141-150`), which CODAP v3 provides via the standard plugin API. It serializes its full graph via `graphStore.serializeGraph(PaletteStore.palette)`.

### Building Models Undo/Redo Modes

Building Models detects the undo mode from CODAP's interactive frame response (`codap-connect.ts:129-134`):
1. `externalUndoAvailable` → CODAP manages undo; Building Models hides its undo UI
2. `standaloneUndoModeAvailable` → Building Models shows its own undo UI, but still routes undo/redo through CODAP as a round-trip
3. Neither → Building Models manages undo fully locally (no CODAP involvement)

With `standalone=SageModeler`, v3 returns mode 2. See R3 for the detailed round-trip flow and why this is a blocker.

## Out of Scope

- Changes to Building Models (that's a separate project)
- Changes to Cloud File Manager
- Supporting other v2 plugins beyond SageModeler/Building Models
- Performance optimization of the plugin communication layer
- ~~Production deployment changes to CloudFront~~ — completed in [sage-modeler-site PR #211](https://github.com/concord-consortium/sage-modeler-site/pull/211)
- **Proper plugin undo/redo**: A native v3 plugin undo system where CODAP's TreeManager natively understands and records plugin mutations would eliminate the need for the relay/shadow-counter approach, but requires modifications to most DI API handlers and resolving fundamental action-vs-patch undo tensions. See the [prior art analysis](https://docs.google.com/document/d/1RgUoAH09_MavH5TcafBkvvpk1-wzhbYmAsi-DZYtDYM/edit?tab=t.0) for details. This is a significant future investment that should be considered if other plugins need undo support.

## Minimal E2E Smoke Test

This smoke test validates the full SageModeler → CFM → CODAP v3 → Building Models stack. It serves as the baseline acceptance criteria for R1, R2, R5, and R6 (which defer detailed test plans). R3 has its own acceptance criteria above.

1. **Launch**: Start the v3 dev proxy (see R8) and open `https://localhost:10000/`. SageModeler loads.
2. **URL params**: CODAP iframe loads in embedded mode — no menu bar, no splash screen, no undo/redo in component title bars, Building Models plugin visible. No console errors.
3. **Model creation**: In Building Models, create 2–3 nodes and connect them with links. Confirm CODAP creates a "Sage Simulation" dataset with matching attributes (visible in a case table if one is created).
4. **Simulation**: Run a short simulation. Confirm cases/items appear in CODAP's dataset.
5. **Components**: Confirm Building Models can create at least one CODAP graph or case table via the DI API.
6. **Undo/redo** (R3): Undo twice, redo once. Confirm Building Models graph and CODAP dataset/attributes revert/restore accordingly. Verify CODAP's global undo UI does not become enabled from DI traffic alone. In embedded mode with `hideUndoRedoInComponent=yes`, the visual undo/redo buttons are hidden, so this check relies on the debug flag: use `localStorage.debug = "history"` to confirm no undo entries are created from DI traffic.
7. **Save/restore** (R2): Trigger autosave (wait 5+ seconds after a change). Reload the page. Confirm Building Models graph restores from `savedState` and CODAP datasets are recreated.
8. **Dirty state** (R5): Make a change in Building Models. Confirm the outer CFM shows a dirty indicator.

A detailed test plan with edge cases, failure modes, and per-parameter checks will be created as a separate deliverable at `v3/docs/plans/CODAP-1127-sagemodeler-in-v3/test-plan.md`.

## Open Questions

### RESOLVED: How should we test the full SageModeler stack with v3?
**Context**: The full SageModeler experience requires SageModeler → CFM → CODAP → Building Models running together. Manual testing against all four projects is complex. The SageModeler dev proxy could help, but it currently routes to `../codap/dist/` which may need to point to v3's build output.
**Options considered**:
- A) Use the SageModeler dev proxy, pointing `/codap/` at v3's build output
- B) Deploy v3 to a staging URL and configure SageModeler to use it via `codap` query parameter override
- C) Test CODAP v3 in isolation with a mock Building Models plugin, then integrate

**Decision**: Create a v3-compatible dev proxy. This has been implemented in [sage-modeler-site PR #210](https://github.com/concord-consortium/sage-modeler-site/pull/210). See R8.

### RESOLVED: What is the priority for v2 document compatibility?
**Context**: Plugin state flows through the standard plugin API (`get interactiveFrame` → `savedState`), not through any v2-specific mechanism.
**Options considered**:
- A) High priority — users have existing documents that must open in v3
- B) Medium priority — nice to have but not blocking SageModeler adoption
- C) Low priority — not relevant to SageModeler-in-v3 workflow

**Decision**: C) Low priority. Plugin state is handled entirely via the plugin API. V2→v3 document migration is a separate, general concern not specific to SageModeler enablement.

### RESOLVED: Is full undoChangeNotice implementation required, or is standalone undo mode sufficient?
**Context**: Building Models has a fallback standalone undo mode. Initial analysis assumed standalone mode meant Building Models manages undo locally. Deeper investigation revealed that even in standalone mode, Building Models routes all undo/redo through CODAP as a round-trip.
**Options considered**:
- A) Full implementation required — undo/redo will silently fail without it
- B) Standalone undo is acceptable for now — can implement undoChangeNotice later
- C) Need to investigate what the actual user experience difference is

**Decision**: A) Full implementation required. Building Models always sends undo/redo through CODAP when `usingCODAP=true`, regardless of mode. In standalone mode, it sends `undoButtonPress`/`redoButtonPress` and expects CODAP to call back with `undoAction`/`redoAction`. Without a working `undoChangeNotice` handler, undo/redo buttons silently do nothing. See R3 for details.

### RESOLVED: Does v3 correctly handle the CFM message protocol in the SageModeler iframe stack?
**Context**: The SageModeler iframe stack uses two communication layers: CFM's `cfm::` postMessage protocol for file management, and the embedded server's iframe-phone RPC. Need to verify v3 handles the CFM protocol correctly across the iframe boundary, particularly given the version difference between outer CFM (v1.9.x) and inner CFM (~2.1.0-pre.18).
**Options considered**:
- A) This should be tested empirically by running the full stack
- B) Code review of v3's CFM integration is sufficient

**Decision**: A) Test empirically by running the full stack using the v3 dev proxy (see R8). This is the most reliable way to verify the full message protocol works end-to-end.

### RESOLVED: What `externalUndoAvailable` / `standaloneUndoModeAvailable` values does v3 return?
**Context**: Building Models checks these values from `interactiveFrame.get` to decide its undo mode.
**Options considered**:
- A) Investigate in the code and document the current behavior
- B) Test empirically with Building Models

**Decision**: Resolved via code review. In `interactive-frame-handler.ts:26,35`:
- `externalUndoAvailable: !uiState.standaloneMode` → **false** (because `standalone=SageModeler` makes `standaloneMode` true)
- `standaloneUndoModeAvailable: uiState.standaloneMode` → **true**

This means Building Models will enter **standalone undo mode**. However, deeper investigation (see R3) revealed that even in standalone mode, Building Models routes all undo/redo through CODAP as a round-trip via `undoChangeNotice`. The unimplemented handler **is a blocker** — undo/redo buttons silently fail.
