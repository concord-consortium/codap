The code in the `v3` folder is the code for a web app named CODAP (Common Online Data Analysis Platform). We are in the process of rewriting CODAP using modern technologies like TypeScript, React, etc. (V2 was written in JavaScript 10-15 years ago using the defunct SproutCore framework.) A somewhat out-of-date version of the V2 code for the CODAP application is in the `apps/dg` folder. (The current version of the V2 code is in the same folder on the `master` branch, but I doubt the relevant code has changed much in the interim.) The task at hand is to implement support for the `componentMode` url parameter in V3 that matches the implementation in V2. I have enclosed below an analysis of the use of the `componentMode` url parameter in V2 code that you (Copilot/ChatGPT 5.2) performed in another chat window. For the V3 implementation I think that `componentMode` should be a property of the `UIState` class (ui-state.ts). Vis-a-vis your suggestion of a "minimal chrome" mode, I think there should be properties in the `UIState` class, e.g. `shouldRenderToolbar` or `allowComponentResize` that can make use of more primitive properties like `standaloneMode`, `componentMode`, `embeddedMode`, etc. In the V3 code, individual component rendering and resizing is handled by the `FreeTileComponent` (free-tile-component.tsx), which makes use of a `TileModel` (tile-model.ts). The container component which manages the set of tiles/components is the `FreeTileRowComponent` (free-tile-row.tsx), which makes use of the `FreeTileRow` model (free-tile-row.ts). I would like you to develop an implementation plan for supporting the `componentMode` url parameter in V3 that matches the features of the same url parameter in the V2 code.

Here is the analysis that you (Copilot/ChatGPT 5.2) developed from the V2 implementation:

# `componentMode` URL parameter (legacy DG → rewrite requirements)

CODAP legacy (SproutCore) supports a query parameter `componentMode` which is defined in `DG` and consumed throughout the UI to switch CODAP into a “component-only / minimal chrome” mode.

This document summarizes:
- Where `componentMode` is defined in the legacy code
- Where it changes behavior
- What the rewrite should implement to match user-visible behavior

## Definition and semantics

- Legacy definition: `DG.componentMode` is derived from the URL query string.
  - Source: `codap/apps/dg/core.js`
  - Implementation: `getUrlParameter('componentMode', 'no')`
- Values are treated as **strings**: `'yes'` and `'no'`.
  - Default is `'no'` when the parameter is absent.
  - Call sites typically check `DG.get('componentMode') === 'yes'`.

**Rewrite guidance**
- Parse `componentMode` from the query string.
- Preserve the `'yes'`/`'no'` semantics for compatibility.
- Recommended modern shape: expose as a boolean (e.g. `isComponentMode`) *but* compute it from the string the same way: `componentMode === 'yes'`.

## Behavior changes (legacy → rewrite requirements)

### 1) Hide application chrome (tool shelf / top bar / infobar)

**Legacy behavior**
- In component mode, key top-level UI chrome is hidden:
  - The “navBar” (CFM wrapper/infobar) is not visible.
  - The “topView” (tool shelf background + tool buttons) is hidden.

**Where in legacy**
- `codap/apps/dg/resources/main_page.js`
  - `navBar.isVisible: !(kIsComponentMode || kIsEmbeddedMode)`
  - `mainPane.init()` hides `topView` when `kIsComponentMode || kIsEmbeddedMode`

**Rewrite requirements**
- When `componentMode=yes`:
  - Do not render the normal top chrome (menu/toolbar/tool shelf / CFM wrapper) for the primary CODAP shell.
  - The remaining document/content area should fill the viewport (see scroll behavior below).

### 2) Disable scrollbars and remove content top offset (full-bleed content)

**Legacy behavior**
- In component mode, the document scroll view:
  - Has no horizontal/vertical scrollers.
  - Is positioned at the top of the pane (`top` adjusted to `0`).

**Where in legacy**
- `codap/apps/dg/resources/main_page.js` in `mainPane.init()`:
  - `tScrollView.adjust('top', 0)`
  - `tScrollView.set('hasHorizontalScroller', false)`
  - `tScrollView.set('hasVerticalScroller', false)`

**Rewrite requirements**
- When `componentMode=yes`:
  - Treat the main document container as full-bleed.
  - Ensure the page does not show scrollbars for the CODAP surface.
  - If your modern layout uses CSS overflow, set it to prevent scrollbars for the CODAP surface container.

### 3) Lock down component window interactions (drag/move/resize/close/minimize)

**Legacy behavior**
- In component mode, component “windows” are effectively locked down:
  - Resize borders/handles are not included.
  - Dragging the titlebar to move a component is disabled.
  - Close and minimize buttons are removed from the component titlebar.

**Where in legacy**
- `codap/apps/dg/views/component_view.js`
  - `kLockThingsDown = kViewInComponentMode`
  - `childViews` excludes border/resize views when `DG.get('componentMode') !== 'no'`
  - Titlebar `childViews` excludes `minimize closeBox` when locked down
  - Titlebar `canBeDragged()` returns `!kLockThingsDown`

**Rewrite requirements**
- When `componentMode=yes`:
  - Disable moving components by drag.
  - Disable resizing components by handles/borders.
  - Remove or disable close/minimize controls in component headers.

### 4) Auto-select the component after initial render

**Legacy behavior**
- When in component mode and a component view is visible, it schedules `select()` after render.

**Where in legacy**
- `codap/apps/dg/views/component_view.js` in `init()`:
  - `invokeLater(() => this.select())`

**Rewrite requirements**
- When `componentMode=yes`:
  - Ensure the primary component becomes the “selected/active” component on initial mount.
  - This may imply:
    - Focus/selection state is set
    - Inspector/side panels (if any exist in your rewrite) bind to that component
    - Keyboard shortcuts route to the active component

### 5) Show Undo/Redo controls in the component titlebar (unless explicitly hidden)

**Legacy behavior**
- In component mode (and embedded mode), CODAP may show Undo/Redo buttons in the component titlebar.
- This behavior is also gated by `hideUndoRedoInComponent`.

**Where in legacy**
- `codap/apps/dg/views/component_view.js`
  - `kShowUndoRedoButtons = (kViewInComponentMode || kViewInEmbeddedMode) && !kHideUndoRedoInComponent`
  - Titlebar `childViews` includes `undo redo` when enabled

**Rewrite requirements**
- When `componentMode=yes`:
  - If your normal global toolbar is hidden, provide Undo/Redo somewhere accessible.
  - Match legacy intent: Undo/Redo may be visible *in-component* unless `hideUndoRedoInComponent=yes`.

### 6) Suppress “unsaved changes” unload confirmation

**Legacy behavior**
- CODAP normally prompts on unload when there are unsaved changes.
- In component mode (and embedded mode), this prompt is suppressed.

**Where in legacy**
- `codap/apps/dg/controllers/app_controller.js`
  - `window.onbeforeunload` returns a confirmation message only when:
    - `hasUnsavedChanges`
    - `embeddedMode === 'no'`
    - `componentMode === 'no'`

**Rewrite requirements**
- When `componentMode=yes`:
  - Do not show/trigger an “unsaved changes” unload confirmation.

### 7) Do not update the browser tab title from the document name

**Legacy behavior**
- CODAP updates the browser tab title when the document name changes.
- In component mode (and embedded mode), it does nothing.

**Where in legacy**
- `codap/apps/dg/controllers/document_controller.js`
  - `setPageTitle()` returns early when in component or embedded mode.

**Rewrite requirements**
- When `componentMode=yes`:
  - Avoid syncing the document name into the browser tab title (or at least match the “no-op” semantics).

### 8) Do not show the splash screen

**Legacy behavior**
- Splash is not shown in component mode.

**Where in legacy**
- `codap/apps/dg/resources/splash.js`
  - Splash display is guarded by `DG.get('componentMode') !== 'yes'`.

**Rewrite requirements**
- When `componentMode=yes`:
  - Skip any splash screen/loading panel that would normally appear.

## Relationship to `embeddedMode`

In multiple places, the legacy app treats `componentMode` and `embeddedMode` similarly (both hide top chrome and scrollbars, both suppress title updates, etc.).

**Rewrite guidance**
- You may want a shared “minimal chrome” mode in the rewrite that both flags feed into.
- Keep the distinctions:
  - `componentMode` specifically locks down component window controls (drag/close/minimize/resize) in `DG.ComponentView`.
  - `embeddedMode` likely has additional behavior elsewhere (e.g. iframePhone setup) that is unrelated to `componentMode`.

## Suggested acceptance checks

- `?componentMode=no` (or absent): normal CODAP UI.
- `?componentMode=yes`:
  - Tool shelf/top chrome hidden
  - No scrollbars on CODAP surface
  - Components not movable/resizable via UI chrome
  - No close/minimize buttons on component header
  - Undo/redo available in-component (unless `hideUndoRedoInComponent=yes`)
  - No unload confirmation prompt for unsaved changes
  - Document name changes do not change browser tab title
  - No splash screen
