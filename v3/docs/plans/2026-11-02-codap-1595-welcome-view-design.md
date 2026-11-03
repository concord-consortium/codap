# CODAP-1595: About dialog welcome view — Design

**Status:** Approved
**Jira:** [CODAP-1595](https://concord-consortium.atlassian.net/browse/CODAP-1595)
**Branch:** `codap-1595-about-dialog`
**Builds on:** [About CODAP dialog design](2026-10-30-codap-1595-about-dialog-design.md),
[open-source libraries design](2026-11-02-codap-1595-oss-libraries-design.md)

## Goal

Add a third view to the About dialog, **Welcome**, that opens automatically when CODAP loads. It introduces
CODAP and offers "About & licensing", "Get started", and "Don't show this again".

## When it opens

On app startup, the dialog opens on the welcome view unless any of these is true:

| Condition | Why |
|---|---|
| `persistentState.hideWelcome` | The user checked "Don't show this again" |
| `uiState.minimalChrome` | Component or embedded mode |
| `uiState.standaloneMode` | A plugin running alone, with no CODAP UI |
| `hasInteractiveApiContext()` | Activity Player or another LARA host |
| `noEntryModal` URL parameter | Used to suppress startup dialogs (e.g. by tests and embedders) |

It **does** open when a document auto-opens (shared links, `url`, `sample`, `#file=`).

The check is a small exported function, `shouldShowWelcome()`, so it can be tested without rendering `App`.

### Relationship to the entry modal

When the existing `UserEntryModal` ("Open Document" / "Create New Document") also shows, the welcome view
appears **on top of it**. Both are open at once. Chakra's modal manager treats the most recently opened modal
as the top one, so the welcome view gets focus and Esc; closing it returns focus to the entry modal underneath.

`AboutDialog` is already rendered after `UserEntryModal` in `App`. The entry modal portals into its own
container (`#user-entry-drop-overlay`), so the layering must be verified in the browser during implementation.

If stacking turns out not to work well, revisit later (e.g. show the entry modal after the welcome view closes).

## State

### `uiState`

Replace the boolean `showAboutDialog` with a view:

- `initialAboutDialogView: "welcome" | "about" | undefined` (observable); the dialog is open when it's set
- `openAboutDialog(view: "welcome" | "about")` (action)
- `closeAboutDialog()` (action)

Callers:

- Help menu item → `uiState.openAboutDialog("about")`
- One-time startup effect in `App` → `uiState.openAboutDialog("welcome")` when `shouldShowWelcome()` is true
- `App` renders:

  ```tsx
  <AboutDialog
    isOpen={!!uiState.initialAboutDialogView}
    initialView={uiState.initialAboutDialogView ?? "about"}
    onClose={() => uiState.closeAboutDialog()}
  />
  ```

### `persistentState`

- `hideWelcome: types.maybe(types.boolean)`
- `setHideWelcome(hide: boolean)`, which saves to localStorage like the existing actions (and so is shared
  across tabs)

The checkbox calls `setHideWelcome()` whenever it changes, so the choice sticks however the dialog is closed
(×, Esc, or "Get started").

## Dialog changes

### `initialView` prop

`AboutDialog` gains `initialView: "welcome" | "about"`. Each time it opens, it resets to `initialView` (it
currently always resets to "about").

### Welcome view

- **Header:** title "Welcome to CODAP", × close button. Same header structure as the other views: only the
  title is inside `ModalHeader`, so it names the dialog.
- **Body:**
  - The same logo as the About view. Extract the `<img>` into a small shared component so the two can't drift.
  - Intro text, centered: "Explore, analyze, and visualize data right in your browser. New here? Take the
    quick tour, or dive into a sample document."
- **Footer:**
  - "Don't show this again": Chakra `Checkbox` (CODAP's existing checkbox theme), on the left.
  - "About & licensing": `Button variant="v3Clear"`, switches to the About view. (The mockup shows a text
    link; the existing v3 button style is used instead, consistent with the rest of the dialog.)
  - "Get started": `Button variant="v3Default"`, closes the dialog.

### Focus

- Opening on the welcome view: initial focus on **Get started** (via `CodapModal`'s `initialRef`).
- "About & licensing": focus moves to the header × button, the first control in the About view.
- Closing:
  - Opened from the Help menu (`initialView="about"`): focus returns to the Help menu button (unchanged).
  - Opened at startup (`initialView="welcome"`): no `finalFocusRef`; Chakra returns focus to whatever had it
    before, e.g. the entry modal underneath. Using the Help menu button here would pull focus out from under
    the entry modal.

### About view reached from the welcome view

Identical to the About view opened from the Help menu. No Back button to the welcome view (the mockup shows
none); × and Close close the dialog.

### Strings

New strings in `en-US.json5`:

- `V3.AboutDialog.welcome.title`: "Welcome to CODAP"
- `V3.AboutDialog.welcome.intro`: "Explore, analyze, and visualize data right in your browser. New here? Take
  the quick tour, or dive into a sample document."
- `V3.AboutDialog.welcome.dontShowAgain`: "Don’t show this again"
- `V3.AboutDialog.welcome.aboutButton`: "About & licensing"
- `V3.AboutDialog.welcome.getStarted`: "Get started"

## Testing

**Jest**

- `ui-state.test.ts`: replace the `showAboutDialog` tests with `openAboutDialog` / `closeAboutDialog` /
  `initialAboutDialogView`.
- `persistent-state.test.ts`: `setHideWelcome` sets the value and saves it.
- `shouldShowWelcome()`: shows by default; skipped for `hideWelcome`, component mode, embedded mode,
  standalone mode, an interactive-API context, and `noEntryModal`; still shows with `url` or `sample`.
- `about-dialog.test.tsx` with `initialView="welcome"`: named "Welcome to CODAP"; logo and intro text shown;
  focus starts on Get started; Get started calls `onClose`; "About & licensing" shows the About view and
  focuses ×; the checkbox sets and clears `persistentState.hideWelcome`; reopening shows the welcome view.
  Existing tests pass `initialView="about"`.
- `use-cloud-file-manager.test.tsx`: the About item calls `openAboutDialog("about")`.

**Cypress**

- Existing specs visit plain CODAP URLs, so the welcome view would cover everything and break them. In
  `cypress/support/e2e.ts`, a `window:before:load` hook sets `hideWelcome` in the stored persistent state
  before each page load, unless a test opts out (e.g. via `Cypress.env`). Existing specs then behave as today.
- New test in `about-dialog.spec.ts` (opted out of the preset): load CODAP without `noEntryModal`; the welcome
  view appears on top of the entry modal; check "Don't show this again"; Get started closes it and the entry
  modal still works; after a reload, the welcome view doesn't appear.
- Run the broader Cypress suite, not just the About dialog specs, since the preset touches every spec.

## Docs to update

- [About CODAP dialog design](2026-10-30-codap-1595-about-dialog-design.md): note the welcome view and link
  here.

## Out of scope

- Tour and sample-document buttons on the welcome view (the intro text mentions them; the mockup has no
  buttons for them).
- An in-app setting to turn the welcome view back on. For now, clearing site data or localStorage does it.
