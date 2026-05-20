# Graphics Acceleration Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-toggleable "Graphics Acceleration" item to CODAP's Settings menu that forces all graphs and map point layers to use Canvas2D instead of WebGL, persisted across launches and effective without a page reload.

**Architecture:** Extend `PersistentState` with a new optional boolean field named `disableGraphicsAcceleration` (truthy means user disabled accel; `undefined` is the default). Introduce a pure helper that composes the new user setting with the existing per-graph debug `forcedRendererType` (user-disabled wins; otherwise debug override; otherwise default). Wire the helper into `use-point-renderer.ts` so all graphs and map point layers swap renderers immediately via the existing fallback paths. Add the menu item (with divider above) to the CFM-managed Settings dropdown using two designer-provided SVG icons, and revise the existing Toolbar Position wording for consistency.

**Tech Stack:** React 18, TypeScript, MobX-State-Tree (`@concord-consortium/mobx-state-tree`), mobx-react-lite (`observer`), PIXI.js (`PixiPointRenderer`), Canvas2D (`CanvasPointRenderer`), Jest. CFM menu rendering via `@concord-consortium/cloud-file-manager`. SVG icons imported as URL strings via the `.nosvgr.svg` extension convention.

**Design doc:** `v3/docs/plans/2026-05-19-graphics-acceleration-toggle-design.md`

**Working directory for all commands:** `/Users/kswenson/Development/idea-dev/codap/v3` (run all `npm` / `npx` / `jest` commands from here). Git commands run from the repo root one directory up.

---

## File structure

**Modify:**

- `src/models/persistent-state.ts` — add `disableGraphicsAcceleration` field + setter
- `src/models/persistent-state.test.ts` — extend with new tests
- `src/components/data-display/renderer/use-point-renderer.ts` — observe setting, compose precedence, handle canvas→null transition
- `src/lib/cfm/use-cloud-file-manager.ts` — add menu item, divider, icon imports
- `src/utilities/translation/lang/en-US.json5` — revise 2 strings, add 2 strings

**Create:**

- `src/components/data-display/renderer/effective-forced-renderer-type.ts` — pure helper
- `src/components/data-display/renderer/effective-forced-renderer-type.test.ts` — unit tests for the helper
- `src/assets/cfm/graphics-acceleration-turn-on-icon.nosvgr.svg` — designer bolt icon
- `src/assets/cfm/graphics-acceleration-turn-off-icon.nosvgr.svg` — designer bolt-with-slash icon

---

## Task 1: Add `disableGraphicsAcceleration` field to PersistentState

**Files:**
- Modify: `src/models/persistent-state.ts`
- Test: `src/models/persistent-state.test.ts`

**Polarity convention:** The field name expresses the *non-default* state, so consumer code reads cleanly: `if (persistentState.disableGraphicsAcceleration) { /* user disabled accel */ }`. Default is `undefined` (accel enabled — current behavior). Setting `true` disables; setting `false` explicitly re-enables (writes through `localStorage` so cross-tab sync fires).

- [ ] **Step 1: Write the failing test**

Open `src/models/persistent-state.test.ts`. It currently contains:

```typescript
import { persistentState } from "./persistent-state"

describe("PersistentState", () => {
  it("can toggle toolbarPosition", () => {
    expect(persistentState.toolbarPosition).toBe("Top")
    persistentState.setToolbarPosition("Left")
    expect(persistentState.toolbarPosition).toBe("Left")
    persistentState.setToolbarPosition("Top")
    expect(persistentState.toolbarPosition).toBe("Top")
  })
})
```

Add a second `it()` block immediately after the existing one (still inside the `describe`):

```typescript
  it("can toggle disableGraphicsAcceleration", () => {
    expect(persistentState.disableGraphicsAcceleration).toBeUndefined()
    persistentState.setDisableGraphicsAcceleration(true)
    expect(persistentState.disableGraphicsAcceleration).toBe(true)
    persistentState.setDisableGraphicsAcceleration(false)
    expect(persistentState.disableGraphicsAcceleration).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

From `v3/`:

```
npm test -- persistent-state
```

Expected: the new test fails because `disableGraphicsAcceleration` and `setDisableGraphicsAcceleration` don't exist yet (TS error or runtime `undefined`).

- [ ] **Step 3: Add the field and setter**

In `src/models/persistent-state.ts`, modify the model definition. The current file:

```typescript
export const PersistentState = types.model("PersistentState", {
  toolbarPosition: types.optional(types.enumeration(["Top", "Left"]), "Top")
})
.actions(self => ({
  save() {
    try {
      localStorage.setItem(kPersistentStateKey, JSON.stringify(getSnapshot(self)))
    } catch (e) {
      //
    }
  }
}))
.actions(self => ({
  setToolbarPosition(position: "Top" | "Left") {
    self.toolbarPosition = position
    self.save()
  }
}))
```

Change to:

```typescript
export const PersistentState = types.model("PersistentState", {
  toolbarPosition: types.optional(types.enumeration(["Top", "Left"]), "Top"),
  disableGraphicsAcceleration: types.maybe(types.boolean)
})
.actions(self => ({
  save() {
    try {
      localStorage.setItem(kPersistentStateKey, JSON.stringify(getSnapshot(self)))
    } catch (e) {
      //
    }
  }
}))
.actions(self => ({
  setToolbarPosition(position: "Top" | "Left") {
    self.toolbarPosition = position
    self.save()
  },
  setDisableGraphicsAcceleration(disabled: boolean) {
    self.disableGraphicsAcceleration = disabled
    self.save()
  }
}))
```

Note: `types.maybe(types.boolean)` makes the field `boolean | undefined`, defaulting to `undefined`. The setter accepts a concrete boolean so a re-enable writes `false` explicitly (rather than clearing to `undefined`), which keeps the change observable and lets cross-tab sync fire.

- [ ] **Step 4: Run test to verify it passes**

```
npm test -- persistent-state
```

Expected: both `it()` blocks pass.

- [ ] **Step 5: Type-check**

```
npm run build:tsc
```

Expected: passes with no errors.

- [ ] **Step 6: Commit**

From the repo root (one directory up from `v3/`):

```
git add v3/src/models/persistent-state.ts v3/src/models/persistent-state.test.ts
git commit -m "$(cat <<'EOF'
CODAP-1339: add disableGraphicsAcceleration to PersistentState

Adds a persisted optional boolean representing the user's preference
to force Canvas2D rendering. Default is undefined (accel enabled —
current behavior); truthy means user disabled. Mirrors the existing
toolbarPosition field — same save() helper, same localStorage key,
same cross-tab sync.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Install designer's bolt icons

**Files:**
- Create: `src/assets/cfm/graphics-acceleration-turn-on-icon.nosvgr.svg`
- Create: `src/assets/cfm/graphics-acceleration-turn-off-icon.nosvgr.svg`

(No unit tests — these are static asset files. They'll be exercised manually in Task 6.)

The designer provided two SVGs in `~/Downloads/`:
- `graphics-acceleration-turn-on-icon.svg` (bolt — shown when accel is OFF, click turns it on)
- `graphics-acceleration-turn-off-icon.svg` (bolt with diagonal slash — shown when accel is ON, click turns it off)

These already match CODAP's existing CFM icon style (fill-based, `#006C8E` / `#D3F4FF` brand colors, `viewBox="0 0 24 24"`). Copy them verbatim — no content normalization needed — and append `.nosvgr.svg` to the filename to opt out of SVGR component import (matches the existing `icon-toolbar-position-*.nosvgr.svg` convention so webpack URL-imports them).

- [ ] **Step 1: Copy both icons from Downloads**

```
cp ~/Downloads/graphics-acceleration-turn-on-icon.svg \
   v3/src/assets/cfm/graphics-acceleration-turn-on-icon.nosvgr.svg

cp ~/Downloads/graphics-acceleration-turn-off-icon.svg \
   v3/src/assets/cfm/graphics-acceleration-turn-off-icon.nosvgr.svg
```

Run from the repo root (`/Users/kswenson/Development/idea-dev/codap`).

- [ ] **Step 2: Verify the files are valid SVG**

```
head -2 v3/src/assets/cfm/graphics-acceleration-turn-on-icon.nosvgr.svg
head -2 v3/src/assets/cfm/graphics-acceleration-turn-off-icon.nosvgr.svg
```

Expected output: each file starts with `<?xml version="1.0" encoding="UTF-8"?>` followed by an `<svg ...>` opening tag with `viewBox="0 0 24 24"`.

- [ ] **Step 3: Verify build still works**

```
npm run build:tsc
```

Expected: no errors. (Webpack's URL loader picks these up at build time; `tsc` verifies the rest of the codebase still compiles.)

- [ ] **Step 4: Commit**

```
git add v3/src/assets/cfm/graphics-acceleration-turn-on-icon.nosvgr.svg \
        v3/src/assets/cfm/graphics-acceleration-turn-off-icon.nosvgr.svg
git commit -F /tmp/codap-1339-task2-msg.txt
```

…where the message file contains (write it first with `cat > /tmp/codap-1339-task2-msg.txt <<'EOF' ... EOF`):

```
CODAP-1339: add designer icons for graphics acceleration toggle

Two designer-provided SVGs (bolt and bolt-with-slash) used by the
Settings menu item. Stored as .nosvgr.svg files (URL-imported, not
React-component-imported) following the existing CFM icon convention.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 3: Add translation strings and revise toolbar wording

**Files:**
- Modify: `src/utilities/translation/lang/en-US.json5`

(Other locale files are synced from POEditor — do not touch them in this PR.)

- [ ] **Step 1: Revise the two existing Toolbar Position strings**

Open `src/utilities/translation/lang/en-US.json5` and locate lines 1650-1651:

```json5
    "V3.AppController.optionMenuItems.positionToolShelfLeft": "Toolbar Position: Top",
    "V3.AppController.optionMenuItems.positionToolShelfTop": "Toolbar Position: Left"
```

Change them to:

```json5
    "V3.AppController.optionMenuItems.positionToolShelfLeft": "Toolbar Position: Move to the top",
    "V3.AppController.optionMenuItems.positionToolShelfTop": "Toolbar Position: Move to the left",
```

Note the trailing comma after the second line (it'll have a sibling below).

- [ ] **Step 2: Add the two new Graphics Acceleration strings**

Immediately after the revised line 1651 (now ending with a comma), insert:

```json5
    "V3.AppController.optionMenuItems.graphicsAccelerationOn": "Graphics Acceleration: Turn off",
    "V3.AppController.optionMenuItems.graphicsAccelerationOff": "Graphics Acceleration: Turn on"
```

The block in en-US.json5 should now read:

```json5
    "V3.AppController.optionMenuItems.positionToolShelfLeft": "Toolbar Position: Move to the top",
    "V3.AppController.optionMenuItems.positionToolShelfTop": "Toolbar Position: Move to the left",
    "V3.AppController.optionMenuItems.graphicsAccelerationOn": "Graphics Acceleration: Turn off",
    "V3.AppController.optionMenuItems.graphicsAccelerationOff": "Graphics Acceleration: Turn on"
```

**Key-suffix convention** (for reviewers): the suffix matches the *current* state; the value describes the resulting action when clicked. So `…On` means accel is currently on → click turns it off.

- [ ] **Step 3: Verify JSON5 parses**

```
npm run build:tsc
```

Expected: passes. (TypeScript loads translation strings via a typed wrapper; any malformed JSON5 will surface here.)

- [ ] **Step 4: Lint**

```
npm run lint -- src/utilities/translation/lang/en-US.json5
```

Expected: clean.

- [ ] **Step 5: Commit**

```
git add v3/src/utilities/translation/lang/en-US.json5
git commit -m "$(cat <<'EOF'
CODAP-1339: revise toolbar wording, add graphics acceleration strings

Two existing Toolbar Position strings become "Toolbar Position: Move to
the top/left" so they share the "Field: Action" verb pattern with the
new Graphics Acceleration item.

Adds graphicsAccelerationOn / graphicsAccelerationOff keys. Other
locales sync from POEditor — not touched here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add pure helper for effective forced renderer type

**Files:**
- Create: `src/components/data-display/renderer/effective-forced-renderer-type.ts`
- Test: `src/components/data-display/renderer/effective-forced-renderer-type.test.ts`

**Why a pure helper:** The precedence rule (`user-OFF` > debug `forcedRendererType` > default) is pure logic with three inputs and one output. Extracting it means it's unit-testable without setting up a `usePointRenderer` test rig (which doesn't exist in this codebase yet).

- [ ] **Step 1: Write the failing test**

Create `src/components/data-display/renderer/effective-forced-renderer-type.test.ts` with the following content:

```typescript
import { computeEffectiveForcedRendererType } from "./effective-forced-renderer-type"

describe("computeEffectiveForcedRendererType", () => {
  it("returns 'canvas' when accel is disabled, regardless of debug override", () => {
    expect(computeEffectiveForcedRendererType(true, null)).toBe("canvas")
    expect(computeEffectiveForcedRendererType(true, "webgl")).toBe("canvas")
    expect(computeEffectiveForcedRendererType(true, "canvas")).toBe("canvas")
  })

  it("returns the debug override when accel is not disabled", () => {
    expect(computeEffectiveForcedRendererType(false, "webgl")).toBe("webgl")
    expect(computeEffectiveForcedRendererType(false, "canvas")).toBe("canvas")
    expect(computeEffectiveForcedRendererType(undefined, "webgl")).toBe("webgl")
  })

  it("returns null (default behavior) when accel is not disabled and no debug override", () => {
    expect(computeEffectiveForcedRendererType(false, null)).toBe(null)
    expect(computeEffectiveForcedRendererType(undefined, null)).toBe(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- effective-forced-renderer-type
```

Expected: failure — module does not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/data-display/renderer/effective-forced-renderer-type.ts`:

```typescript
export type ForcedRendererType = "webgl" | "canvas" | null

export function computeEffectiveForcedRendererType(
  disableGraphicsAcceleration: boolean | undefined,
  debugForcedType: ForcedRendererType
): ForcedRendererType {
  if (disableGraphicsAcceleration) return "canvas"
  return debugForcedType
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npm test -- effective-forced-renderer-type
```

Expected: all three `it()` blocks pass.

- [ ] **Step 5: Type-check and lint**

```
npm run build:tsc && npm run lint -- src/components/data-display/renderer/effective-forced-renderer-type.ts src/components/data-display/renderer/effective-forced-renderer-type.test.ts
```

Expected: both clean.

- [ ] **Step 6: Commit**

```
git add v3/src/components/data-display/renderer/effective-forced-renderer-type.ts \
        v3/src/components/data-display/renderer/effective-forced-renderer-type.test.ts
git commit -m "$(cat <<'EOF'
CODAP-1339: add pure helper for effective forced renderer type

Computes the effective renderer override from the user-level
disableGraphicsAcceleration setting and the per-graph debug override.
A truthy user setting wins; otherwise the debug override applies;
otherwise null (default behavior).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire helper into `use-point-renderer.ts`

**Files:**
- Modify: `src/components/data-display/renderer/use-point-renderer.ts`

This task wires the pure helper into the hook, observing `persistentState.disableGraphicsAcceleration`. The parent components (`GraphComponent`, `MapComponent`) are already wrapped in `observer()` from `mobx-react-lite`, so observable reads inside the hook are automatically tracked — no explicit `reaction` needed.

**Also handles the canvas→null transition** that the design flagged: when the user toggles accel back ON after being OFF, the existing line 267-288 effect doesn't re-request a WebGL context. We add a third branch using a ref to detect the transition specifically.

(No new unit tests — the precedence logic is covered by Task 4; the integration is covered by manual smoke in Task 7.)

- [ ] **Step 1: Add imports**

Open `src/components/data-display/renderer/use-point-renderer.ts`. Near the top, find the existing imports. Add these two new imports (place them with the other relative imports, alphabetically by path):

```typescript
import { persistentState } from "../../../models/persistent-state"
import { computeEffectiveForcedRendererType } from "./effective-forced-renderer-type"
```

The exact path to `persistent-state`: from `src/components/data-display/renderer/use-point-renderer.ts` it's `../../../models/persistent-state`. Verify by reading the existing imports in the file — adjust if the directory depth differs.

- [ ] **Step 2: Compute `effectiveForcedType` inside the hook**

Find this line inside `usePointRenderer` (currently line 146):

```typescript
  // Forced renderer type override (for testing - null means use normal logic)
  const [forcedRendererType, setForcedRendererType] = useState<"webgl" | "canvas" | null>(null)
```

Immediately below this declaration (before the next blank line), add:

```typescript

  // Effective forced type: user-level "disable graphics acceleration" wins
  // over the per-graph debug override. Reading
  // persistentState.disableGraphicsAcceleration here registers a MobX
  // observation; parent components are observer-wrapped, so a change to the
  // setting triggers a re-render and recomputes this value.
  const effectiveForcedType = computeEffectiveForcedRendererType(
    persistentState.disableGraphicsAcceleration,
    forcedRendererType
  )
```

- [ ] **Step 3: Update the context-management effect (lines 267-288)**

Locate the effect that currently reads:

```typescript
  // Manage WebGL context when forced renderer type changes
  useEffect(() => {
    if (skipContextRegistration) return

    if (forcedRendererType === "canvas" && hasWebGLContext) {
      // Forcing Canvas mode - release the WebGL context back to the pool
      webGLContextManager.yieldContext(id)
      setHasWebGLContext(false)
    } else if (forcedRendererType === "webgl" && !hasWebGLContext) {
      // Forcing WebGL mode - request a high-priority context (user-initiated action)
      const highPriority = webGLContextManager.getNextUserInteractionPriority()
      webGLContextManager.updatePriority(id, highPriority)
      const granted = webGLContextManager.requestContext({
        ...contextConsumer,
        priority: highPriority
      })
      if (granted) {
        setHasWebGLContext(true)
        setContextWasDenied(false)
      }
    }
  }, [forcedRendererType, hasWebGLContext, id, skipContextRegistration, contextConsumer])
```

Replace **the entire block** with:

```typescript
  // Track whether the last yield was caused by an effective force-to-canvas,
  // so that lifting the force can re-request a normal-priority context.
  const yieldedDueToForceCanvasRef = useRef(false)

  // Manage WebGL context when effective forced renderer type changes
  useEffect(() => {
    if (skipContextRegistration) return

    if (effectiveForcedType === "canvas" && hasWebGLContext) {
      // Forcing Canvas mode - release the WebGL context back to the pool
      webGLContextManager.yieldContext(id)
      setHasWebGLContext(false)
      yieldedDueToForceCanvasRef.current = true
    } else if (effectiveForcedType === "webgl" && !hasWebGLContext) {
      // Forcing WebGL mode - request a high-priority context (user-initiated action)
      const highPriority = webGLContextManager.getNextUserInteractionPriority()
      webGLContextManager.updatePriority(id, highPriority)
      const granted = webGLContextManager.requestContext({
        ...contextConsumer,
        priority: highPriority
      })
      if (granted) {
        setHasWebGLContext(true)
        setContextWasDenied(false)
      }
      yieldedDueToForceCanvasRef.current = false
    } else if (
      effectiveForcedType == null &&
      yieldedDueToForceCanvasRef.current &&
      !hasWebGLContext &&
      isVisible
    ) {
      // Force-to-canvas was just lifted; re-request a normal-priority context.
      yieldedDueToForceCanvasRef.current = false
      const granted = webGLContextManager.requestContext(contextConsumer)
      if (granted) {
        setHasWebGLContext(true)
        setContextWasDenied(false)
      } else {
        setContextWasDenied(true)
      }
    }
  }, [effectiveForcedType, hasWebGLContext, id, skipContextRegistration, contextConsumer, isVisible])
```

Two changes from the original:

1. `forcedRendererType` references → `effectiveForcedType`.
2. New third branch + `yieldedDueToForceCanvasRef` ref to drive a re-request when force is lifted. `isVisible` is added to the deps array so re-requests don't happen for an offscreen tile.

- [ ] **Step 4: Update the renderer-selection effect (lines 297-399)**

In the same file, find the effect starting near line 297:

```typescript
  // Switch renderer based on WebGL context availability or forced type
  useEffect(() => {
    const switchRenderer = async () => {
      // ...
      if (forcedRendererType === "webgl" && hasWebGLContext) {
        // Forced WebGL mode AND we have a context
        newRenderer = new PixiPointRenderer(stateRef.current)
      } else if (forcedRendererType === "canvas") {
        // Forced Canvas mode (for testing)
        newRenderer = new CanvasPointRenderer(stateRef.current)
      } else if (forcedRendererType === "webgl" && !hasWebGLContext) {
        // Forced WebGL but waiting for context - skip this intermediate state
        return
      } else if (hasWebGLContext) {
        // ...
```

Make three changes inside the `switchRenderer` function:

1. Replace `forcedRendererType === "webgl" && hasWebGLContext` → `effectiveForcedType === "webgl" && hasWebGLContext`
2. Replace `forcedRendererType === "canvas"` → `effectiveForcedType === "canvas"`
3. Replace `forcedRendererType === "webgl" && !hasWebGLContext` → `effectiveForcedType === "webgl" && !hasWebGLContext`

Then update the deps array at the bottom of this effect (currently line 399):

```typescript
  }, [hasWebGLContext, contextWasDenied, forcedRendererType, onRendererChange])
```

Change to:

```typescript
  }, [hasWebGLContext, contextWasDenied, effectiveForcedType, onRendererChange])
```

Leave the eslint-disable comment above the deps array as is — its rationale (about `renderer` and `rendererOptions`) is unchanged.

- [ ] **Step 5: Verify all references are updated**

```
grep -n "forcedRendererType" v3/src/components/data-display/renderer/use-point-renderer.ts
```

Expected lines that should still reference `forcedRendererType` (the per-graph debug state itself):

- The `useState` declaration (~line 146)
- Inside `toggleRendererType` callback (~lines 425-429) — this reads the current renderer's capability, not `forcedRendererType`, so it should not need changes

Any other references to `forcedRendererType` in the file (other than the toggle callback and the state declaration) should now be `effectiveForcedType`. Confirm by inspecting each grep hit; the only legitimate remaining occurrences are the state declaration and the setter usage inside `toggleRendererType`.

- [ ] **Step 6: Run tests**

```
npm test -- effective-forced-renderer-type persistent-state
```

Expected: all pass. (Neither suite directly mounts `usePointRenderer`, but both validate the inputs and outputs.)

- [ ] **Step 7: Run any other tests that import from this module**

```
npm test -- use-point-renderer
```

Expected: passes if any indirect tests exist; "no tests found" is also acceptable since the hook itself has no test file. If indirect tests exist and one fails, inspect it before proceeding.

- [ ] **Step 8: Type-check and lint**

```
npm run build:tsc && npm run lint -- src/components/data-display/renderer/use-point-renderer.ts
```

Expected: clean. Lint may flag the new `useRef` if not imported — verify `useRef` is already in the React imports at the top of the file (it should be — the file uses other refs already).

- [ ] **Step 9: Commit**

```
git add v3/src/components/data-display/renderer/use-point-renderer.ts
git commit -m "$(cat <<'EOF'
CODAP-1339: wire disableGraphicsAcceleration into use-point-renderer

Observes persistentState.disableGraphicsAcceleration via the
surrounding observer-wrapped parent components and composes it with
the existing per-graph debug forcedRendererType (user-disabled wins).
Adds a third branch to the context-management effect so that
re-enabling the user setting re-requests a WebGL context for graphs
that yielded due to the force-to-canvas path.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add Graphics Acceleration item to the Settings menu

**Files:**
- Modify: `src/lib/cfm/use-cloud-file-manager.ts`

The CFM menu schema accepts a bare `'separator'` string between items. Adding the menu item is purely a CFM-config change — the click handler calls the existing setter.

(No new unit tests — verified manually in Task 7.)

- [ ] **Step 1: Add the icon imports**

Open `src/lib/cfm/use-cloud-file-manager.ts`. Find the block of existing icon imports (search for `ToolbarPositionLeftIcon`). Add these two imports alongside the other CFM-icon imports:

```typescript
import GraphicsAccelOnIcon from "../../assets/cfm/graphics-acceleration-turn-on-icon.nosvgr.svg"
import GraphicsAccelOffIcon from "../../assets/cfm/graphics-acceleration-turn-off-icon.nosvgr.svg"
```

Follow the local convention (relative paths, ordering style) of the surrounding imports.

- [ ] **Step 2: Add `isAccelOn` derivation in `getMenuBar()`**

Locate the function `getMenuBar(cfm: CloudFileManager)` (currently starts ~line 208). It begins with:

```typescript
function getMenuBar(cfm: CloudFileManager) {
  const isToolbarTop = persistentState.toolbarPosition === "Top"
  return {
```

Change to:

```typescript
function getMenuBar(cfm: CloudFileManager) {
  const isToolbarTop = persistentState.toolbarPosition === "Top"
  const isAccelOn = !persistentState.disableGraphicsAcceleration
  return {
```

- [ ] **Step 3: Add the menu item and divider**

Inside the same `getMenuBar()` return value, find the `settings-menu` block (currently lines 243-259):

```typescript
      {
        className: "settings-menu",
        menuAnchorIcon: SettingsIcon,
        menuAnchorName: t("DG.ToolButtonData.optionMenu.title"),
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
          }
        ]
      }
```

Change the `menu` array to include a separator and the new item:

```typescript
      {
        className: "settings-menu",
        menuAnchorIcon: SettingsIcon,
        menuAnchorName: t("DG.ToolButtonData.optionMenu.title"),
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
          "separator",
          {
            icon: isAccelOn ? GraphicsAccelOffIcon : GraphicsAccelOnIcon,
            name: t(`V3.AppController.optionMenuItems.graphicsAcceleration${isAccelOn ? "On" : "Off"}`),
            action() {
              runInAction(() => {
                // If accel is currently on, this click disables it (true);
                // if currently off, this click re-enables it (false).
                persistentState.setDisableGraphicsAcceleration(isAccelOn)
                cfm.client.updateMenuBar(getMenuBar(cfm))
              })
            }
          }
        ]
      }
```

**Icon mapping** (matches the design and matches the existing Toolbar Position convention):

- `isAccelOn === true` → accel is currently on → click turns it off → show the `off` icon (bolt-off)
- `isAccelOn === false` → accel is currently off → click turns it on → show the `on` icon (bolt)

- [ ] **Step 4: Type-check**

```
npm run build:tsc
```

Expected: passes. If TypeScript complains that `"separator"` isn't an allowed menu-item type, the CFM library's `CFMMenuItem` type accepts `string | CFMMenuItemObject`, so a bare string is valid. If the local typing has a narrower restriction, check `node_modules/@concord-consortium/cloud-file-manager/dist/types/app-options.d.ts` and adjust the type assertion if needed (e.g., `"separator" as const`).

- [ ] **Step 5: Lint**

```
npm run lint -- src/lib/cfm/use-cloud-file-manager.ts
```

Expected: clean.

- [ ] **Step 6: Commit**

```
git add v3/src/lib/cfm/use-cloud-file-manager.ts
git commit -m "$(cat <<'EOF'
CODAP-1339: add Graphics Acceleration toggle to Settings menu

Adds a second item (with separator) to the existing Settings dropdown.
The icon and label both describe the result of clicking, matching the
existing Toolbar Position convention and the designer's mock.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Manual smoke test

**Files:** none modified — verification only.

This step verifies the end-to-end behavior that the unit tests don't cover (mid-session renderer swap, persistence, cross-tab sync, visual style of the new icons).

- [ ] **Step 1: Start the dev server**

```
npm start
```

Wait for "compiled successfully" then open the printed `http://localhost:…` URL in a browser.

- [ ] **Step 2: Verify the menu rendering**

1. Open the Settings dropdown (gear icon in the top-right).
2. Confirm two items appear, separated by a horizontal divider:
   - "Toolbar Position: Move to the left" (assuming default top position)
   - "Graphics Acceleration: Turn off" (assuming accel default on)
3. Confirm the bolt-off icon appears next to the Graphics Acceleration label.
4. Visual style check: both icons should match the existing Toolbar Position icons (same brand colors, same weight). Flag any visual issues to the designer in the PR description.

- [ ] **Step 3: Test the toolbar wording**

1. Click "Toolbar Position: Move to the left". Confirm the toolbar moves to the left.
2. Reopen the menu. Confirm the label now reads "Toolbar Position: Move to the top".
3. Click it. Confirm the toolbar returns to the top and the label flips back.

- [ ] **Step 4: Test the graphics acceleration toggle with a graph**

1. Open or create a document. Drag a dataset onto the page (any of the v3 sample datasets works — `Mammals` has enough points). Make a scatterplot.
2. Open DevTools console. Run `localStorage.debug = "renderers"` and reload — the GL/2D badge will appear on the graph for verification.
3. Confirm the badge reads `GL` (WebGL by default).
4. Open Settings → click "Graphics Acceleration: Turn off". Confirm:
   - The label flips to "Graphics Acceleration: Turn on" with the bolt icon.
   - The graph's badge changes from `GL` to `2D` without page reload.
   - No visible flicker or rendering glitch.
5. Click again. Confirm the graph swaps back to `GL`.

- [ ] **Step 5: Test persistence across reload**

1. Turn Graphics Acceleration off.
2. Reload the page (cmd-R).
3. Open Settings — confirm the label is "Graphics Acceleration: Turn on" (i.e., it's currently off, as set).
4. Confirm the graph boots into `2D` mode immediately with no `GL` flash.
5. Turn accel back on. Reload. Confirm it persists in the "on" state.

- [ ] **Step 6: Test with a map**

1. Add a map tile to the document. Add a point layer (e.g., a dataset with lat/long).
2. Confirm the map's renderer badge reads `GL`.
3. Toggle Graphics Acceleration off. Confirm the map's badge swaps to `2D`.
4. Toggle on. Confirm it swaps back.

- [ ] **Step 7: Test cross-tab sync**

1. Open the same CODAP URL in two browser tabs (`cmd-N` then paste the URL).
2. In tab A, open Settings and toggle Graphics Acceleration off.
3. Switch to tab B (no reload). Open Settings — the label should already reflect the new state.
4. Confirm the graph in tab B has swapped to `2D` (may take a moment due to React's render cycle, but should happen without intervention).

- [ ] **Step 8: Edge-case: `localStorage` disabled**

(Optional — skip if not easily testable in your dev environment.)

1. In DevTools → Application → Storage, block site data for the dev URL, or open a private/incognito window.
2. Toggle the setting. Confirm the in-session toggle still works (graph swaps).
3. Reload. Confirm the setting reverts to the default `on` (since persistence failed silently).

- [ ] **Step 9: If everything passes, no commit needed**

Smoke testing produces no code changes. If you discovered issues during smoke that require fixes, fix them in a follow-up commit and re-run the relevant smoke steps before moving on.

---

## Self-review (engineer reviewing their own work before PR)

Before pushing the branch and opening the PR, re-read:

- [ ] The design doc at `v3/docs/plans/2026-05-19-graphics-acceleration-toggle-design.md` — confirm every "In scope" item has been touched.
- [ ] `git log CODAP-1339-graphics-acceleration-setting ^main --oneline` — six commits expected (one per task 1-6).
- [ ] `git diff main..HEAD --stat` — should show only the files listed in the design doc's "Files touched" section, plus the new design and plan docs.
- [ ] No stray debug `console.log` calls or commented-out code.
- [ ] No `forcedRendererType` references in `use-point-renderer.ts` that should have been `effectiveForcedType` (re-grep to confirm).

---

## Out of scope (do NOT implement in this PR)

These appeared in the Jira description but are deliberately deferred per the design doc:

- Auto-detect / benchmark of bad WebGL implementations.
- Logging of `gl.RENDERER` / `WEBGL_debug_renderer_info` / context-loss events for diagnostics.
- Locale files other than `en-US.json5` (synced via POEditor).
- Hiding/disabling the debug renderer badge when user setting is OFF.
- Map polygon layer (Leaflet/SVG; not WebGL).
- Document-level setting (this is a user preference, not document state).
