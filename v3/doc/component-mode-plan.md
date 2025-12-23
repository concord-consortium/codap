# V3 Implementation Plan: `componentMode` URL parameter (match V2 behavior)

This document describes how to implement support for the `componentMode` URL parameter in CODAP V3 so that it matches the user-visible behavior of CODAP V2.

The guiding principles:

- Preserve V2 semantics: **only** `componentMode=yes` enables component mode; absence defaults to “no”.
- Centralize policy in `UIState` so rendering/layout/interaction code can simply consult derived flags.
- Treat `componentMode` as a *mode* that affects the entire shell: hide app chrome, remove scrollbars, and lock down component-window interactions.
- If multiple tiles are present, **lock down all tiles**.
- In component mode: **hide minimize button** and **hide beta banner**.

---

## Required V2 behaviors to match

When `?componentMode=yes`:

1) Hide application chrome (top/menu bar, tool shelf) so content is full-bleed.
2) Disable scrollbars for the CODAP surface and remove any top offset.
3) Lock down component windows:
   - no moving by dragging the title bar
   - no resizing handles/borders
   - no close and no minimize buttons
4) Auto-select the component after initial render.
5) Provide Undo/Redo controls in the component title bar (unless `hideUndoRedoInComponent=yes`).
6) Suppress the “unsaved changes” unload confirmation.
7) Do not update the browser tab title from the document name.
8) Do not show the splash screen.

V2 also treats `embeddedMode` similarly in many places; V3 can be structured so `embeddedMode` can later share the same “minimal chrome” infrastructure.

---

## URL parameter semantics

### V2 compatibility

- V2 reads the query parameter as a string.
- Enabled only when the string value is exactly `"yes"`.
- Absent implies `"no"`.

### V3 decision

- Add `componentMode?: string | null` to the parsed URL params.
- Add a boolean getter `uiState.isComponentMode` computed as `urlParams.componentMode === "yes"`.
- Keep this strict check (do not treat `true`/`1` as equivalent) to match V2.

Also add `hideUndoRedoInComponent?: string | null`:
- Enabled only when the string value is exactly `"yes"`.

---

## Where to implement: `UIState`

`UIState` is the correct place to hold the “mode” state and derived UX policy.

### Suggested additions to `UIState`

File: `src/models/ui-state.ts`

Add these primitives and derived getters:

- Primitive (stored):
  - `_componentMode: string = "no"` (or store a boolean; string is closer to V2)

- Setter:
  - `setComponentMode(componentModeParam?: string | null)` which sets `_componentMode` to `componentModeParam?.toLowerCase() ?? "no"`

- Derived:
  - `get componentMode()` returns `_componentMode`
  - `get isComponentMode()` returns `this._componentMode === "yes"`

- Shared “minimal chrome” concept (for future `embeddedMode`):
  - `get isMinimalChromeMode()` returns `this.isComponentMode /* || this.isEmbeddedMode */`

- UX policy flags (used by UI code):
  - `get shouldRenderMenuBar()` returns `!this.isMinimalChromeMode`
  - `get shouldRenderToolShelf()` returns `!this.isMinimalChromeMode && !this.standaloneMode`
  - `get shouldRenderBetaBanner()` returns `!this.isMinimalChromeMode`

  - `get allowComponentMove()` returns `!this.isComponentMode`
  - `get allowComponentResize()` returns `!this.isComponentMode`
  - `get allowComponentClose()` returns `!this.isComponentMode`
  - `get allowComponentMinimize()` returns `!this.isComponentMode`

  - `get shouldShowUndoRedoInComponentTitleBar()` returns `this.isMinimalChromeMode && urlParams.hideUndoRedoInComponent !== "yes"`

  - `get shouldSuppressUnsavedWarning()` returns `this.isMinimalChromeMode`
  - `get shouldUpdateBrowserTitleFromDocument()` returns `!this.isMinimalChromeMode`

  - `get shouldShowSplashScreen()` returns `!this.isComponentMode`

Notes:
- `UIState` already imports `booleanParam` and uses URL params for standalone mode in a hook. It’s OK for `UIState` to import `urlParams` if needed, but the cleanest approach is:
  - parse URL params in a hook/entrypoint
  - call `uiState.setComponentMode(urlParams.componentMode)`
  - keep `UIState` independent of the URL parsing module except for initialization.

---

## Specific code-change suggestions (file-by-file)

### 1) Parse `componentMode` and `hideUndoRedoInComponent`

File: `src/utilities/url-params.ts`

- Add to `UrlParams` interface:
  - `componentMode?: string | null`
  - `hideUndoRedoInComponent?: string | null`

No further parsing changes are required because `query-string` already handles it.

---

### 2) Initialize `UIState` from URL params

File: `src/hooks/use-ui-state.ts`

Currently it only does:

- `uiState.setStandaloneMode(urlParams.standalone)`

Extend it to also set component mode:

- `uiState.setComponentMode(urlParams.componentMode)`

If later you implement `embeddedMode`, the same hook can call `uiState.setEmbeddedMode(urlParams.embeddedMode)`.

---

### 3) Hide chrome: MenuBar, ToolShelf, BetaBanner

File: `src/components/app.tsx`

Change rendering so:

- `{isBeta() && <BetaBanner />}` becomes gated by `uiState.shouldRenderBetaBanner`.
- `<MenuBar/>` is rendered only if `uiState.shouldRenderMenuBar`.
- `<ToolShelf/>` is rendered only if `uiState.shouldRenderToolShelf`.

This makes component mode “chrome free” like V2.

---

### 4) Full-bleed layout and remove scrollbars

There are two concerns: layout offsets and overflow.

#### 4a) Layout offsets (menu bar + tool shelf heights)

Files:
- `src/components/app.scss`
- `src/components/container/container.scss`

Today the layout assumes:
- toolbar-container height is `calc(100% - menu-bar-height)`
- container height is `calc(100% - tool-shelf-height)`

Suggested approach:

1) Add a CSS class when in minimal chrome mode.
   - In `App`, apply e.g. `className={clsx("codap-app", { "minimal-chrome": uiState.isMinimalChromeMode, beta: ... })}`

2) Update SCSS:

- In `app.scss`, add overrides so `.codap-app.minimal-chrome .toolbar-container` uses `height: 100%`.
- In `container.scss`, add overrides so `.codap-app.minimal-chrome .codap-container` uses `height: 100%`.

This matches V2 behavior of adjusting scroll view top to `0`.

#### 4b) Scrollbars / overflow

V2 disables scrollers in component mode.

Suggested minimal implementation:

- In `App` (a `useEffect`), when `uiState.isComponentMode`:
  - set `document.documentElement.style.overflow = "hidden"`
  - set `document.body.style.overflow = "hidden"`
  - restore previous values in cleanup

This avoids browser scrollbars while letting tiles manage their internal scrolling.

---

### 5) Lock down component interactions (move/resize/close/minimize)

#### 5a) Disable moving by dragging title bar

Files:
- `src/components/container/free-tile-component.tsx`
- `src/components/container/use-tile-drag.ts`
- `src/components/component-title-bar.tsx`

The drag starts via the `onMoveTilePointerDown` passed to `TitleBar`.

Suggested approach:

- In `FreeTileComponent`, only pass `onMoveTilePointerDown` when `uiState.allowComponentMove`.
  - e.g. `onMoveTilePointerDown={uiState.allowComponentMove ? handleMoveTilePointerDown : undefined}`

Optional hardening:
- In `useTileDrag`, return early if `!uiState.allowComponentMove`.

#### 5b) Disable resizing handles and borders

File: `src/components/container/free-tile-component.tsx`

Currently resize widgets are shown when:

- `!isMinimized && !isStandalone`

Change to:

- `!isMinimized && !isStandalone && uiState.allowComponentResize`

This removes borders/handles in component mode.

#### 5c) Remove close and minimize buttons

File: `src/components/component-title-bar.tsx`

Currently it always renders the minimize button, and renders close unless `tile?.cannotClose`.

Change to:

- Only render minimize if `uiState.allowComponentMinimize`.
- Only render close if `uiState.allowComponentClose && !tile?.cannotClose`.

This matches V2’s removal of minimize/close in component mode.

---

### 6) Auto-select component after initial render

File: `src/components/container/free-tile-row.tsx`

V3 already synchronizes focus with the top tile (`row.last`) via reactions.

To match V2’s “select after render” more explicitly:

- Add an effect that runs once when `uiState.isComponentMode`:
  - If `uiState.focusedTile` is empty and row has at least one tile id:
    - call `uiState.setFocusedTile(row.last || row.tileIds[0])`

This should be a no-op in normal mode.

---

### 7) Show Undo/Redo controls in the component titlebar

V2 shows Undo/Redo in the component titlebar when in component mode (and embedded mode) unless `hideUndoRedoInComponent=yes`.

V3 currently places Undo/Redo in the ToolShelf, which will be hidden.

Suggested implementation:

- Add a small `UndoRedo` button group inside `ComponentTitleBar` when:

  - `uiState.shouldShowUndoRedoInComponentTitleBar` is true

- Use the global document undo/redo API:
  - `appState.document.canUndo`, `appState.document.undoLastAction()`
  - `appState.document.canRedo`, `appState.document.redoLastAction()`

This avoids threading `document` through many components.

(If you prefer to avoid importing `appState` into UI components, the alternative is to plumb `document` down from `App` → `Container` → `CodapComponent` → `TitleBar` props. That is a larger refactor.)

---

### 8) Suppress unsaved-changes unload confirmation

File: `src/components/app.tsx`

Currently:

```ts
window.onbeforeunload = function() {
  if (urlParams.suppressUnsavedWarning === undefined && cfm.client.state.dirty) {
    return t("V3.general.unsavedChangesWarning")
  }
}
```

Change to also suppress in component mode:

- Add `&& !uiState.shouldSuppressUnsavedWarning` to the condition.

This matches V2, which suppresses in component/embedded mode.

---

### 9) Do not update browser tab title in component mode

File: `src/models/app-state.ts`

There is already a TODO referencing V2 logic.

Suggested change:

- Import `uiState` (or consult `urlParams.componentMode`) and guard the autorun:

```ts
if (!uiState.shouldUpdateBrowserTitleFromDocument) return
```

This prevents document title updates in component mode.

---

### 10) Do not show splash screen

V3 splash is currently defined in `src/index.html` and is hidden after CFM events.

To match V2 (“splash not shown in component mode”), hide it immediately on startup.

Suggested implementation:

File: `src/index.tsx`

- Before rendering React, check `location.search`:
  - `const isComponentMode = new URLSearchParams(location.search).get("componentMode") === "yes"`
  - If true, hide `#splash-screen` (either directly or by calling `hideSplashScreen()` from `src/lib/cfm/splash-screen.ts`).

This ensures no splash flash in component mode.

---

## Acceptance checks

### Normal mode

- `/?componentMode=no` or absent:
  - Normal CODAP UI.
  - MenuBar, ToolShelf, BetaBanner behave as before.
  - Tiles are movable/resizable/closable/minimizable.
  - Document title updates as document title changes.
  - Unsaved changes warning works as before.

### Component mode

- `/?componentMode=yes`:
  - MenuBar hidden.
  - ToolShelf hidden.
  - BetaBanner hidden.
  - Layout is full-bleed; no extra top offsets.
  - No page-level scrollbars for the CODAP surface.
  - Tiles cannot be moved by dragging title bar.
  - Tiles cannot be resized (no borders/handles).
  - Title bar has no minimize button and no close button.
  - The primary tile is focused/selected after initial render.
  - Undo/Redo buttons appear in the tile title bar unless `hideUndoRedoInComponent=yes`.
  - No unload confirmation for unsaved changes.
  - Document name changes do not update the browser tab title.
  - Splash screen is not shown.

---

## Suggested tests (minimal, high-value)

- Extend `src/utilities/url-params.test.ts` to cover `componentMode` and `hideUndoRedoInComponent` parsing.
- Add/extend `src/components/component-title-bar.test.tsx`:
  - buttons hidden when `uiState.isComponentMode`.
  - Undo/Redo shown when `uiState.shouldShowUndoRedoInComponentTitleBar`.
- Optional integration test for `App` rendering:
  - with `componentMode=yes`, MenuBar/ToolShelf/BetaBanner not present.

---

## Notes / future alignment with `embeddedMode`

V2 treats `componentMode` and `embeddedMode` similarly for chrome/scroll/title/unload suppression.

This plan structures V3 to later add `embeddedMode` with minimal disruption:

- Add `embeddedMode` to URL params + `uiState`.
- Make `uiState.isMinimalChromeMode = isComponentMode || isEmbeddedMode`.
- Keep `componentMode`-specific lock-down behavior (move/resize/close/minimize) tied strictly to `isComponentMode`.
