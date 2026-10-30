# CODAP-1595: About CODAP dialog — Design

**Status:** Approved
**Jira:** [CODAP-1595](https://concord-consortium.atlassian.net/browse/CODAP-1595)
**Branch:** `codap-1595-about-dialog`

## Goal

Add an "About CODAP…" item at the bottom of the Help menu that opens a dialog showing CODAP's identity,
version, copyright, and license/terms information, with a second view for open-source acknowledgements.

The dialog has two views:

1. **About CODAP** — logo, version, copyright, license and terms copy, links.
2. **Open-source libraries** — acknowledgements intro and a link to the full license texts. The library
   list itself is deferred to a follow-up task (see [Out of scope](#out-of-scope)).

## Entry point and state

### Help menu item

`src/lib/cfm/use-cloud-file-manager.ts` — `getMenuBar()` builds the Help menu as a CFM config array.
After the "Privacy Page" item, append:

```ts
{ separator: true },
{
  icon: AboutIcon,
  name: t("DG.AppController.optionMenuItems.about"),   // "About CODAP..." (existing, already translated)
  action: () => uiState.setShowAboutDialog(true)
}
```

The settings menu in the same file already uses `{ separator: true }`, so no CFM changes are needed.

**Icon:** `src/assets/cfm/about-icon.nosvgr.svg`, a copy of `src/assets/icons/inspector-panel/info-icon.svg`
(the table inspector's Info icon). The CFM menu requires URL-style `.nosvgr.svg` assets rather than SVGR
components. Fill colors may need adjusting to match the other Help menu icons.

### Open state

The CFM menu is configured outside React, so the menu action can't set component state. Add an
observable flag to `src/models/ui-state.ts`, following the same pattern as `hideUserEntryModal`:

- `showAboutDialog` (observable, default `false`)
- `setShowAboutDialog(show: boolean)` (action)

`src/components/app.tsx` (already an observer) renders:

```tsx
<AboutDialog isOpen={uiState.showAboutDialog} onClose={() => uiState.setShowAboutDialog(false)} />
```

### Focus return

The menu item that opens the dialog disappears when the CFM menu closes, so focus returns to the Help
menu anchor instead. The dialog passes a `finalFocusRef` pointing at the `.help-menu` anchor element,
resolved when the dialog opens. Implementation must verify that the CFM anchor is focusable.

## CodapModal changes

`src/components/codap-modal.tsx` currently always renders a draggable `ModalContent` at a fixed position
(`left: 350px`, `top: 250px`) with Chakra `size="xs"`. The About dialog must be centered and not
draggable, with content-driven height.

Add optional props:

| Prop | Default | Effect |
|---|---|---|
| `isCentered` | `false` | Passed through to Chakra `Modal` |
| `isDraggable` | `true` | When `false`, render a plain `ModalContent` without drag handlers, `cursor: move`, or absolute `left`/`top` positioning |

`size="xs"` must also be overridable (or not applied when non-draggable) so the dialog can be ~520px wide.
Defaults preserve current behavior, so existing modals are unaffected.

## AboutDialog component

New files in `src/components/about-dialog/`:

- `about-dialog.tsx` — the dialog
- `about-dialog.scss` — scoped styles
- `about-dialog-constants.ts` — link URLs
- `external-link.tsx` — external link component (see [External links](#external-links))

The dialog is built on `CodapModal` with `isCentered` and `isDraggable={false}`, using Chakra
`ModalHeader`, `ModalCloseButton`, `ModalBody`, and `ModalFooter`.

The current view is local state, `"about" | "libraries"`, reset to `"about"` each time the dialog opens.

**Styling** follows the mockups (white header with larger title, light footer band, teal primary button).
This differs from the existing `CodapModal` header styling (30px grey bar, 12px title), so the About dialog
uses its own scoped class rather than `codap-modal-header`.

### About CODAP view

- **Header:** title "About CODAP", × close button.
- **Body:**
  - Logo: `src/assets/codap-about-screen.png` (813×299), displayed ~240px wide. Translatable alt text:
    "CODAP, a product of The Concord Consortium".
  - "Common Online Data Analysis Platform"
  - Version pill: "Version %{version} · build %{build}", using `displayVersion(pkg.version)` and
    `build_number.json` — the same sources the CFM menu bar uses (`src/lib/cfm/handle-cfm-event.ts`).
  - "© 1996–%{year} The Concord Consortium, Inc.", where `year` is `new Date().getFullYear()`.
  - Divider
  - Heading "License & Terms of Use"
  - Paragraph 1 (bold lead-in, MIT License link)
  - Paragraph 2 (bold lead-in, Terms of Use link, concord.org/licensing link, licensing@concord.org link)
  - Divider
  - Links row: Terms of Use ↗, Licensing details ↗, Source on GitHub ↗
  - "Open-source libraries & acknowledgements ›" button → switches to the libraries view. The project
    count shown in the mockup is omitted until the list exists.
- **Footer:** Close button.

### Open-source libraries view (shell)

- **Header:** "‹ Back" button (→ About view), title "Open-source libraries", × close button.
- **Body:**
  - "CODAP is built with these open-source projects. Our thanks to their authors and maintainers."
  - (Search bar and library list deferred.)
  - "This list is generated at build time from CODAP's dependencies. Full license texts:
    THIRD-PARTY-NOTICES ↗" — included in full now so the follow-up only needs to add the list and file.
- **Footer:** "‹ Back" button (→ About view), Close button.

### Links

| Text | URL |
|---|---|
| MIT License | https://github.com/concord-consortium/codap/blob/main/LICENSE |
| Terms of Use (paragraph and links row) | https://concord.org/terms-of-use/ |
| concord.org/licensing | https://concord.org/licensing |
| licensing@concord.org | mailto:licensing@concord.org |
| Licensing details | https://concord.org/licensing/ |
| Source on GitHub | https://github.com/concord-consortium/codap |
| THIRD-PARTY-NOTICES | https://github.com/concord-consortium/codap/blob/main/THIRD-PARTY-NOTICES.md |

## Translation

All new strings go in `src/utilities/translation/lang/en-US.json5` under `V3.AboutDialog.*`.

### Sentences with embedded links or bold text

Sentence strings use named `%{name}` placeholders; link text and bold text are separate keys. Translators
see whole sentences, can reorder placeholders, and never handle markup.

```json5
"V3.AboutDialog.license.p1": "%{freeOpenSource} The CODAP source code is released under the %{mitLicense}, so you’re welcome to use, modify, and build on it.",
"V3.AboutDialog.license.freeOpenSource": "CODAP is free, open-source software.",
"V3.AboutDialog.license.mitLicense": "MIT License",
```

A new helper, `translateToElements(key, elements)`, in `src/utilities/translation/`, translates the key,
splits the result on `%{name}` placeholders, and returns a `ReactNode[]` with each placeholder replaced by
the matching element (keyed fragments). Text around placeholders is preserved. A placeholder with no
matching element renders as empty and logs a warning, consistent with `translate()`.

```tsx
translateToElements("V3.AboutDialog.license.p1", {
  freeOpenSource: <strong>{t("V3.AboutDialog.license.freeOpenSource")}</strong>,
  mitLicense: <ExternalLink href={kMitLicenseUrl}>{t("V3.AboutDialog.license.mitLicense")}</ExternalLink>
})
```

Used for: license paragraph 1, license paragraph 2, the copyright line, and the libraries-view footer note.

## Accessibility

| Requirement | How |
|---|---|
| `role="dialog"`, `aria-modal`, labelled by title | Chakra `Modal` / `ModalContent` / `ModalHeader` (header labels the dialog in both views) |
| Focus trap | Chakra `Modal` |
| Close on ×, Close, Esc | `ModalCloseButton`, footer button, Chakra Esc handling |
| Return focus to opener | `finalFocusRef` → Help menu anchor |
| External links open in a new tab with `rel="noopener"` | `ExternalLink` |
| Logo alt text | Translatable string |
| Section heading | "License & Terms of Use" is a real heading element |

### External links

`ExternalLink` renders `<a href target="_blank" rel="noopener noreferrer">`. Links that display ↗ mark the
arrow `aria-hidden` and include visually hidden, translatable text "(opens in a new tab)". The
`mailto:` link does not open a new tab.

### View switching

Switching to the libraries view moves focus to its header Back button. Returning to the About view moves
focus to the "Open-source libraries & acknowledgements" button.

## Testing

**Jest / React Testing Library**

- `about-dialog.test.tsx`:
  - About view renders all content, including version, build number, and current year
  - Every link has the correct `href`, `target`, and `rel`
  - Acknowledgements button switches to the libraries view; both Back buttons return to the About view
  - ×, Close, and Esc each call `onClose`
  - `role="dialog"`, `aria-modal`, and accessible name match the current view's title
  - Reopening the dialog shows the About view
- `translateToElements` tests: placeholder substitution, surrounding text preserved, missing placeholder
  doesn't throw
- `CodapModal` tests: default behavior unchanged; `isDraggable={false}` omits drag positioning
- `use-cloud-file-manager.test.tsx`: Help menu ends with a separator followed by the About item; the
  item's action sets `uiState.showAboutDialog`

**Cypress**

- Open Help → About CODAP, verify the dialog appears, go to the libraries view and back, close with Esc

## Out of scope

Follow-up tasks:

- Open-source library list: search bar, list generated at build time from dependencies, "N projects"
  count on the acknowledgements button, and `THIRD-PARTY-NOTICES.md`. Until that file exists, the
  THIRD-PARTY-NOTICES link will 404.
- "Terms of Use…" Help menu item and ↗ indicators on external Help menu items (shown in the menu mockup)
