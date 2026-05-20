# CODAP-1339 — User-toggleable Graphics Acceleration

**Status:** Design approved 2026-05-19
**Jira:** CODAP-1339 (Provide Enable/Disable Graphics Acceleration option in Settings menu)
**Branch:** `CODAP-1339-graphics-acceleration-setting`

## Problem

A MoDa collaborator runs CODAP on a 2019 Intel MacBook Pro whose WebGL implementation
is so degraded that graphs with more than a few hundred points freeze the machine.
Chrome's global "Use graphics acceleration" toggle works around it, but the user runs
MoDa simulations alongside CODAP and MoDa itself requires acceleration enabled.

CODAP v3 already chooses between WebGL (via PIXI) and a Canvas2D fallback based on a
session-cached probe (`WebGLContextManager.isWebGLAvailable()`). A debug badge on
graphs (gated by `localStorage.debug="renderers"`) flips a per-graph
`forcedRendererType` to swap a single graph between renderers mid-session.

We need a user-visible Settings-menu toggle that lets users force the Canvas2D path
for the whole app, persisted across launches, without requiring a reload.

## Solution overview

Mirror the existing per-graph debug-badge mechanism, but driven by a new
`PersistentState.graphicsAcceleration` boolean (default `true`) instead of per-graph
component state. The user setting composes with the per-graph debug override:
**user setting OFF wins; otherwise debug override applies; otherwise default
WebGL-with-Canvas-fallback.**

The Settings menu in the CFM-managed menu bar gains a second item ("Graphics
Acceleration: Turn on/off") below the existing Toolbar Position item, separated
by a divider. The existing Toolbar Position label is reworded to match the
new "Field: Action" verb pattern for consistency.

## Design sections

### 1. State and persistence

Extend `src/models/persistent-state.ts` with one new field and one setter:

```ts
export const PersistentState = types.model("PersistentState", {
  toolbarPosition: types.optional(types.enumeration(["Top", "Left"]), "Top"),
  graphicsAcceleration: true
})
// ...
setGraphicsAcceleration(enabled: boolean) {
  self.graphicsAcceleration = enabled
  self.save()
}
```

- Default `true` preserves current "try WebGL first" behavior.
- Persisted alongside `toolbarPosition` in the existing `"persistentState"`
  `localStorage` JSON snapshot.
- Cross-tab sync via the existing `storage` event listener (no new code).
- Snapshots written before this field exists deserialize with the default.

### 2. Renderer wiring

In `src/components/data-display/renderer/use-point-renderer.ts`, observe
`persistentState.graphicsAcceleration` and compose it with the existing per-graph
`forcedRendererType` into an **effective forced type**:

```ts
const accelEnabled = persistentState.graphicsAcceleration
const effectiveForcedType: "webgl" | "canvas" | null =
  !accelEnabled ? "canvas" : forcedRendererType
```

Replace reads of `forcedRendererType` inside the two effects (renderer-selection
effect ~lines 297-399, context-management effect ~lines 267-288) with
`effectiveForcedType`.

**Precedence (highest → lowest):**

1. User setting OFF → effective force = `"canvas"`. Overrides debug badge.
2. Per-graph `forcedRendererType` (debug badge) — `"webgl"` | `"canvas"` | `null`.
3. Default — try WebGL; fall back to Canvas if context denied.

**Swap behavior:**

- OFF → all active `usePointRenderer` instances see the change, set
  effective force = `"canvas"`, yield their WebGL contexts, and the
  renderer-selection effect builds a `CanvasPointRenderer` via the existing path.
- ON → effective force returns to the per-graph state (typically `null`);
  the consumer re-requests a WebGL context with its normal priority and the
  existing grant/swap path takes over.

**Implementation detail to resolve at plan-write time:** whether the surrounding
`observer`/`mobx-react` wrapping makes `persistentState.graphicsAcceleration`
reads reactive within the hook's effects, or whether we need an explicit
`reaction` to trigger `effectiveForcedType` updates. Verify by reading the
component wrapper that hosts the hook.

### 3. UI — Settings menu item

In `src/lib/cfm/use-cloud-file-manager.ts` `getMenuBar()`, the Settings sub-menu
grows to:

```
[Toolbar Position: Move to the …]
─────── divider ───────
[Graphics Acceleration: Turn on/off]
```

Wiring (sketch):

```ts
const isToolbarTop = persistentState.toolbarPosition === "Top"
const isAccelOn = persistentState.graphicsAcceleration

menu: [
  {
    icon: isToolbarTop ? ToolbarPositionLeftIcon : ToolbarPositionTopIcon,
    name: t(`V3.AppController.optionMenuItems.positionToolShelf${persistentState.toolbarPosition}`),
    action() {
      runInAction(() => {
        persistentState.setToolbarPosition(isToolbarTop ? "Left" : "Top")
        cfm.client.updateMenuBar(getMenuBar(cfm))
      })
    }
  },
  // divider — exact CFM shape TBD
  {
    icon: isAccelOn ? GraphicsAccelOffIcon : GraphicsAccelOnIcon,
    name: t(`V3.AppController.optionMenuItems.graphicsAcceleration${isAccelOn ? "On" : "Off"}`),
    action() {
      runInAction(() => {
        persistentState.setGraphicsAcceleration(!isAccelOn)
        cfm.client.updateMenuBar(getMenuBar(cfm))
      })
    }
  }
]
```

**Icon and label semantics:** both describe the *result* of clicking (matches
existing Toolbar Position convention and the designer's mock):

- Accel currently ON → show `ti-bolt-off` icon, "Graphics Acceleration: Turn off"
- Accel currently OFF → show `ti-bolt` icon, "Graphics Acceleration: Turn on"

**Divider** — Open implementation detail. The CFM menu library
(`@concord-consortium/cloud-file-manager`) needs to accept either (a) a separator
menu-item shape, (b) a `divider: true` flag on adjacent items, or (c) CSS-only via
item className. Verify CFM's accepted schema at plan-write time and pick the
lightest option; the File menu already uses dividers so the support likely exists.

### 4. Icons

Two new files in `src/assets/cfm/`, following the existing `.nosvgr.svg`
URL-import pattern (bypasses SVGR/svgo; imported as a URL string):

- `icon-graphics-acceleration-on.nosvgr.svg` — Tabler `bolt` path (shown when
  accel is OFF; click turns it on).
- `icon-graphics-acceleration-off.nosvgr.svg` — Tabler `bolt-off` path (shown
  when accel is ON; click turns it off).

**Source paths** — Copy from `@tabler/icons` (MIT-licensed,
github.com/tabler/tabler-icons). Normalize to match existing CFM icons:

- `viewBox="0 0 24 24"`
- `stroke="currentColor"`, `stroke-width="2"`, `fill="none"`
- Strip `<title>` and other no-value attrs

**Attribution** — Add Tabler to an existing notices/licenses file if one exists;
otherwise note the source as an XML comment in each SVG
(`<!-- Source: Tabler Icons (MIT) -->`). Determine at plan-write time.

**Imports** in `use-cloud-file-manager.ts`:

```ts
import GraphicsAccelOnIcon from "../../assets/cfm/icon-graphics-acceleration-on.nosvgr.svg"
import GraphicsAccelOffIcon from "../../assets/cfm/icon-graphics-acceleration-off.nosvgr.svg"
```

### 5. Translation strings

Two changes to `src/utilities/translation/lang/en-US.json5` only. Other locale
files are synced from POEditor and do not need to be touched in this PR.

**A. Revise existing Toolbar Position values** (designer's consistency change):

```diff
- "V3.AppController.optionMenuItems.positionToolShelfLeft": "Toolbar Position: Top",
- "V3.AppController.optionMenuItems.positionToolShelfTop": "Toolbar Position: Left"
+ "V3.AppController.optionMenuItems.positionToolShelfLeft": "Toolbar Position: Move to the top",
+ "V3.AppController.optionMenuItems.positionToolShelfTop": "Toolbar Position: Move to the left"
```

Naming convention preserved: the key suffix matches the *current* toolbar
position; the value describes the resulting action.

**B. Add new Graphics Acceleration keys:**

```json5
"V3.AppController.optionMenuItems.graphicsAccelerationOn": "Graphics Acceleration: Turn off",
"V3.AppController.optionMenuItems.graphicsAccelerationOff": "Graphics Acceleration: Turn on"
```

Same convention: key suffix matches the *current* state; value describes the
resulting action.

### 6. Edge cases and error handling

| # | Case | Behavior |
|---|---|---|
| EC1 | WebGL unavailable in browser at all (`isWebGLAvailable()` returns false) | Menu item still toggles preference; Canvas2D is used either way. No special UI. |
| EC2 | User toggles rapidly | Each toggle is a synchronous `runInAction` write. Existing renderer-selection effect coalesces. No debounce needed. |
| EC3 | Document opens with setting OFF | `persistentState` initializes before any `usePointRenderer` mounts; first evaluation sees `graphicsAcceleration = false` and boots into Canvas with no "WebGL flash." |
| EC4 | `localStorage` write fails (quota, private mode) | Existing `save()` swallows the error silently; in-session toggle still works. Matches Toolbar Position behavior. |
| EC5 | Cross-tab sync | Existing `storage` event listener applies the new snapshot; the other tab's `usePointRenderer` reactions swap renderers. No new code. |
| EC6 | Debug badge interaction when user setting OFF | Debug badge click sets per-graph state, but the user-setting override pins effective force to `"canvas"`. Documented; not surfaced in UI (debug feature is developer-gated). |

### 7. Testing

**Unit tests:**

1. `src/models/persistent-state.test.ts` (extend or create):
   - Default `graphicsAcceleration` is `true`.
   - `setGraphicsAcceleration(false)` updates the model and writes to `localStorage`.
   - Snapshot round-trip preserves the value.
   - Loading a snapshot without the field yields the default `true`.

2. `src/components/data-display/renderer/use-point-renderer.test.ts` (extend):
   - `graphicsAcceleration = false` and no per-graph force → effective force = `"canvas"`; renderer is `CanvasPointRenderer`.
   - `graphicsAcceleration = false` and per-graph force = `"webgl"` → effective force still `"canvas"` (user setting wins).
   - `graphicsAcceleration = true` and per-graph force = `"webgl"` → effective force = `"webgl"`.
   - Flipping `graphicsAcceleration` from `true` → `false` while a renderer is mounted triggers a swap to `CanvasPointRenderer` and yields the WebGL context.
   - Flipping back to `true` swaps back to `PixiPointRenderer` (when context granted).

**No new Cypress test.** End-to-end verification ("click menu item, graph swaps renderer") requires exposing internal state or visual diffing; cost outweighs value here. Covered manually instead.

**Manual smoke test (PR checklist):**

- Build a graph with hundreds of points. Toggle Graphics Acceleration OFF — graph re-renders without visual artifacts; menu label/icon flip. Toggle ON — returns to WebGL.
- Toggle Toolbar Position; confirm new wording reads naturally.
- Reload after toggling accel OFF — setting persists; graph boots straight to Canvas.
- Repeat the toggle with a Map containing point data.
- Two-tab test: toggle in tab A; confirm tab B reflects the change.

## Scope

**In scope:**

- New `graphicsAcceleration: true` field on `PersistentState` with setter and persistence.
- New "Graphics Acceleration: Turn on/off" item in the Settings menu, with bolt/bolt-off icons.
- Updated wording for the existing "Toolbar Position" item in `en-US.json5`.
- Wiring `use-point-renderer.ts` so the user setting forces Canvas across all graphs and map point layers, with the per-graph debug badge as a lower-precedence override.
- Unit tests for `persistent-state` and `use-point-renderer` covering the new precedence rules.

**Explicit non-goals:**

- **Auto-detect / benchmark** of bad WebGL implementations — deferred to the long-term plan in the Jira description.
- **Logging of `gl.RENDERER` / `WEBGL_debug_renderer_info` / context-loss events** — separate work.
- **Locale files other than `en-US.json5`** — synced via POEditor.
- **Hiding/disabling the debug renderer badge** when user setting is OFF — debug feature is developer-gated.
- **Map polygon layer** — Leaflet/SVG; never used WebGL; unaffected.
- **Document-level setting** — this is a user preference, not a per-document setting.

## Files touched (anticipated)

- `src/models/persistent-state.ts` — add field + setter
- `src/models/persistent-state.test.ts` — new tests (create if absent)
- `src/components/data-display/renderer/use-point-renderer.ts` — observe setting, compose force precedence
- `src/components/data-display/renderer/use-point-renderer.test.ts` — new tests
- `src/lib/cfm/use-cloud-file-manager.ts` — add menu item, divider, icon imports
- `src/assets/cfm/icon-graphics-acceleration-on.nosvgr.svg` — new
- `src/assets/cfm/icon-graphics-acceleration-off.nosvgr.svg` — new
- `src/utilities/translation/lang/en-US.json5` — two new keys, two revised values
