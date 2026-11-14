---
name: CODAP-1236 Add missing data-testid values
description: Adds stable data-testid attributes, a codap/require-testid ESLint rule, a unified IMenuItem.dataTestId field, and a data-role attribute across CODAP v3 in support of CODAP-1232's plugin UI-notifications API.
type: closed-spec
---

# CODAP-1236: Add missing data-testid values

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1236

**Status**: **Closed**

## Overview

Add or rename `data-testid` attributes across CODAP v3's menus, dialogs, palettes, inputs, tile-root containers, and D3/SVG elements (legend swatches, selection marquee, axis drag rects) that the upcoming plugin UI-notifications API (CODAP-1232) needs to identify, and fix existing space-containing dynamic testids. Introduce an ESLint rule enforcing `data-testid` on every interactive / semantic UI element under `v3/src/components/`, a unified required `IMenuItem.dataTestId` field, and a CODAP-owned `data-role` attribute for D3/SVG classification where ARIA `role` would mislead. Document the convention in `CLAUDE.md`.

## Project Owner Overview

CODAP-1232 introduces a plugin notification stream (`uiNotificationMonitor` → `uiNotificationNotice`) so that tutorial plugins (CODAP-1227 / 1228 / 1229 / 1230) can react to menu opens, dialog state changes, clicks, drags, and layout changes. Because CODAP's current UI doesn't have stable testids on every relevant element, CODAP-1232's design falls back to a classification ladder (marker classes, `aria-labelledby` trigger lookup, recent-click heuristics) that is brittle and locale-sensitive.

This story lays the groundwork: a comprehensive sweep of CODAP v3's UI that adds locale-independent testids wherever plugins would want to hook. Landing this first lets CODAP-1232 ship in its simpler form (a single `[data-testid]` fast path) and gives plugin authors refactor-resistant identifiers. The work also pays down long-running testing friction — several existing Cypress selectors rely on fragile CSS classes or text-based lookups that will become cleaner `data-testid` selectors as a side effect.

## Requirements

### R1 — Naming convention

All new and renamed testids follow CODAP's existing conventions:

- **Lowercase kebab-case.**
- **No global prefix** except `codap-` on tile-root containers (e.g. `codap-graph`, `codap-case-table`, `codap-web-view`, `codap-map`, `codap-calculator`, `codap-text`, `codap-slider`, `codap-case-card`).
- **Locale-independent.** Testids derive from action/role identifiers, never from visible or translated text.
- **No tile-instance id suffix on inner testids.** Tile instance ids are regenerated every time a document loads, so embedding them would make testids unstable across sessions. Plugins get the `componentId` from the CODAP-1232 notification payload, not from the testid.
- **Role / position / attribute-name suffix** to disambiguate multiple instances of the same element inside one tile — e.g. `-bottom`, `-left`, `-legend`, `-{attrName}`.

**Index conventions.** Where a testid contains `{attrIndex}`, `{collectionIndex}`, or `{index}`, the value is:

- Zero-based, in render order within the visible collection / legend / menu.
- Excludes hidden / set-aside items. Indices are re-assigned to the visible sequence whenever visibility changes.
- Stable within a render pass — MST rerenders that don't change visibility or order preserve each item's index.
- The element SHOULD have a human-readable name source (preferred order: visible text content → `aria-label` → `aria-labelledby`). `aria-label` (not `title`) is added specifically on elements that would otherwise lack an accessible name — SVG swatches, icon-only buttons, bare wrappers. Do NOT add `aria-label` where visible text already serves. If no source is natural, CODAP-1232 omits the `name` field from its payload.
- `title` may be added *in addition* to an `aria-label` for sighted tooltips but never as a substitute.
- **Fixed / semantic indices** (e.g. `{zoneIndex}` on axis drag rects, where 0 / 1 / 2 are permanently lower / mid / upper) are numbered by fixed role rather than visible render order.

**Menu-item `dataTestId` convention.** Menu items defined via an `IMenuItem` config object carry a required `dataTestId: string` field, distinct from `itemKey` (the i18n translation key). Unify the three `IMenuItem` interfaces (`std-menu-list.tsx`, `index-menu-list.tsx`, `attribute-menu-list.tsx`) to require this field. Touches ~21 menu-item definitions across 4 files.

### R2 — ESLint rule: require `data-testid` on interactive / semantic UI elements

Add an ESLint rule at `v3/eslint-rules/codap-require-testid.cjs` (modeled on CFM's `cfm-require-testid.js`), written as CommonJS with `module.exports = {...}`. `.cjs` rather than `.mjs` because the rule must be loadable from both `eslint.config.mjs` (ESM `import`) and the ts-jest-transformed `codap-require-testid.test.ts` (CJS `require`).

**Directory scope**: `v3/src/components/**`.

**Target elements**:
- Native interactive DOM: `<button>`, `<input>`, `<select>`, `<textarea>`
- Chakra render-targets: `<MenuList>`, `<MenuItem>`, `<MenuButton>`, `<ModalContent>` (from `@chakra-ui/react`)
- React-Aria interactive: `<Button>`, `<MenuItem>`, `<Tab>`, `<TabPanel>`, `<Dialog>`, `<Popover>` (from `react-aria-components`)
- Clickable anchors: `<a>` with `onClick`, `role="button"`, or non-empty `href`
- Dialog / panel wrapper divs: `<div>` with className matching `/-dialog$|-panel$|modal-/`
- MenuItem-classed divs: className containing `menuItem`

**Explicit skips**:
- `aria-hidden="true"` — invisible helpers don't need testids.
- `separator` in className.
- ModalOverlay (Chakra backdrop).
- Line-level `// eslint-disable-next-line codap/require-testid` comments for one-off exceptions.

**Value shape check**: the rule checks `data-testid` content only when it is statically resolvable (bare string literal, expression container wrapping a literal, or a ternary of two literals) — lowercase kebab-case is enforced in those cases. Template literals with interpolation, variable references, etc. are trusted by presence alone. The same shape check applies to `data-role` on any element (target or not); missing `data-role` is NOT flagged.

**Origin detection** uses an import-walk: track module-level `ImportDeclaration` nodes to build a local-binding-name → source map. Match JSX element name AND source. No name-match fallback.

Modify `src/components/codap-modal.tsx` so its existing `data-testid` prop is forwarded to the inner `<ModalContent>`. Mark the prop required. Every one of its 10 callers passes a `data-testid`.

**Flat-config integration**: the rule is registered as a local plugin in `v3/eslint.config.mjs` via `plugins: { codap: { rules: { "require-testid": codapRequireTestid } } }` with `rules: { "codap/require-testid": "error" }`.

**Expected upfront cleanup**: pre-check (2026-04-16) estimated ~50 total violations. About 30 already listed in R4.1; the remaining ~20 are native / React-Aria sites the focused sweep didn't audit.

### R3 — Add `data-testid` at every Chakra Menu/Modal call site

Every use of `MenuList` / `MenuItem` / `MenuButton` / `ModalContent` from `@chakra-ui/react` under `v3/src/components/` must carry a `data-testid` that follows R1. Do not add `data-testid` to `<Menu>` or `<Modal>` themselves — those render no DOM. The complete call-site audit is R4.4.

### R4 — Elements that need testid additions, renames, or space-risk fixes

| Element                                   | Current state                                                          | Proposed `data-testid`                          |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| Axis attribute menu (Chakra portal)       | `axis-legend-attribute-menu-list-{place}-{collectionId}`                | `axis-attr-menu-{place}-{collectionIndex}`      |
| Inspector palette (slide-out)             | `codap-inspector-palette`                                              | `inspector-palette-{tile-type}`                 |
| Inspector React-Aria popover element      | `.inspector-menu-popover` (no testid)                                  | `inspector-popover-{name}`                      |
| Inspector React-Aria menu list            | `{name}-menu-list`                                                     | `inspector-menu-{name}`                         |
| Tool-shelf Plugins menu                   | `.tool-shelf-menu-list.plugins` (no testid)                            | `tool-shelf-plugins-menu-list`                  |
| Tool-shelf Tiles menu                     | `tiles-list-menu`                                                      | `tool-shelf-tiles-menu-list`                    |
| Tool-shelf Guide menu                     | (no testid)                                                            | `tool-shelf-guide-menu-list`                    |
| Attribute header context menu             | `attribute-menu-list`                                                  | `attribute-header-menu-{attrIndex}`             |
| Legend swatch / key                       | `legend-key`                                                           | `legend-key-{index}`; `role="img"` + `aria-label` = category name |
| Document filename input                   | `<input aria-label="Document name">` (no testid)                       | `document-name-input`                           |

**Completeness bar**: R4 / R4.1 / R4.2 / R4.3 / R4.4 are the definitive inventory. In-PR additions surfaced during implementation are allowed and must be documented in the PR description; post-merge discoveries go to a follow-up.

#### R4.1 — Additions (elements with no testid today)

Sub-axis SVG groups (`sub-axis-{place}-{index}`), attribute-menu MenuItems (`attribute-option-{attrIndex}`), collection submenu triggers, Remove/Treat-As MenuItems, "No Attributes Available" item, collection title input/preview, index/attribute/ruler MenuItem `dataTestId` values, color picker popover / swatch, boolean cell checkbox, undo/redo buttons, plugins MenuList, user-entry modal, container root, point color setting / swatch, data-tip container, text format buttons, map pin controls, error tester, selection marquee (`role="presentation"` — Cypress-only, not plugin-facing), numeric-axis drag rects (3 per axis; `data-role="axis-drag-rect"` rather than ARIA `role="button"`), slider tile root.

#### R4.2 — Renames (current testid violates convention)

`tiles-list-menu-item` → `tool-shelf-tiles-menu-item-{index}`; `tile-list-menu-icon` → `tool-shelf-tiles-menu-icon`; `guide-menu` → `tool-shelf-guide-menu-list`; `show-guide-item` → `tool-shelf-guide-show-item`; `guide-page-list-item` → `tool-shelf-guide-page-item-{index}`; `` `codap-attribute-button ${attrName}` `` → `codap-attribute-button-{attrIndex}`; `` `delete-data-set-button-${b.className}` `` → `delete-data-set-cancel-button`, `delete-data-set-delete-button`; `text-inspector.tsx` `testId` prop → emit `data-testid` attribute; `attr-precision-select` (date / numeric) → `attr-precision-select-date` / `-numeric`; tile-root renames: `graph` → `codap-graph`, `map` → `codap-map`, `case-table` → `codap-case-table`, `case-card` → `codap-case-card`, `codap-text-content` → `codap-text`.

#### R4.3 — Space-risk dynamic testids (must be fixed)

Every `` `${b.label}-button` `` across modal files (user-entry, edit-formula, edit-attribute-properties, export-data, insert-cases, dataset-info, web-view-url) → per-action stable ids. `` `codap-attribute-button ${attrName}` `` → index-based. `` `tool-shelf-table-${tileTitle}` `` → `tool-shelf-table-{datasetIndex}` with `aria-label`. `` `adornment-checkbox-${titleSlug}` `` → derive from enum / constant key. `` `parent-toggles-case-buttons-${caseButton.textLabel}` `` → `parent-toggles-case-button-{index}`. `` `function-info-button-${func.displayName}` `` → `function-info-button-{index}`.

#### R4.4 — Chakra render-target call-site audit

43 Chakra render-target JSX sites inventoried: 12 MenuList, 17+ MenuItem, 12 MenuButton, 2 ModalContent. 25 need net-new `data-testid`; 18 already have a valid testid; 2 invisible helper MenuButtons excluded. See source spec for full file:line table.

### R5 — Modals requiring reviewer sanity-check

R2's ESLint rule enforces `data-testid` on every `<input>` / `<button>` / `<Button>` / `<MenuItem>` inside these files automatically. The modal list exists as a reviewer sanity-check during R9 verification:

- `menu-bar/user-entry-modal.tsx` — Welcome / splash modal.
- `web-view/web-view-url-modal.tsx` — URL prompt.
- `case-tile-common/attribute-menu/edit-attribute-properties-modal.tsx`
- `common/edit-formula-modal.tsx` and `common/edit-attribute-formula-modal.tsx`
- `case-tile-common/export-data-modal.tsx`
- `case-tile-common/insert-cases-modal.tsx`
- `case-tile-common/inspector-panel/dataset-info-modal.tsx`

### R6 — Single PR

All changes land in one PR on the `CODAP-1236-add-missing-data-testids` branch: the `codap-modal.tsx` testId forwarding change, every testid addition / rename / space-risk fix, the ESLint rule, and the `CLAUDE.md` update.

### R7 — Update existing tests

Cypress support files and Jest tests that use renamed testids are updated in lockstep with each rename:

- `cypress/support/elements/toolbar-elements.ts` — `tiles-list-menu` → `tool-shelf-tiles-menu-list`; `[data-testid=tiles-list-menu-item]` → prefix-match `[data-testid^="tool-shelf-tiles-menu-item-"]`.
- `cypress/e2e/keyboard-navigation.spec.ts:158` — analogous prefix match.
- `cypress/support/elements/graph-legend-elements.ts`, `map-legend-elements.ts` — legend-key + axis-attr-menu renames.
- `cypress/support/elements/graph-tile.ts` / `map-tile.ts` / `slider-tile.ts` — `codap-inspector-palette` → `inspector-palette-{tileType}`.
- `cypress/e2e/slider.spec.ts` — 9 direct `[data-testid=codap-inspector-palette]` references.
- `cypress/support/elements/table-tile.ts` — `attr-precision-select` → disambiguated `-date`/`-numeric`; `attribute-menu-list` → prefix-match `attribute-header-menu-`.
- `cypress/e2e/case-card.spec.ts`, `cypress/e2e/attribute-focus-restore.spec.ts` — `attribute-menu-list` → prefix-match.
- Tile-root renames: no Cypress spec-file churn needed for most (the `$=` suffix-match helper absorbs them); `codap-text-content` → `codap-text` may need targeted updates.
- `cypress/e2e/axis.spec.ts`, `graph.spec.ts`, `pixi-interaction/graph-pixi-interaction.spec.ts`, `smoke/single-codap-smoke.ts` — exact-match `[data-testid=graph]` / `[data-testid=case-table]` references renamed to `codap-`-prefixed forms.

### R8 — Document the convention

Add a "Testing & testid Conventions" section to `CLAUDE.md` at the repo root. No separate `CONTRIBUTING.md` is created. The section covers:

- **Required coverage.** Every user-visible interactive or semantic UI element carries a `data-testid`.
- **Shape.** Lowercase kebab-case. Locale-independent. The ESLint rule `codap/require-testid` enforces presence and kebab-case on statically-resolvable values.
- **Extend existing prefixes — don't fork them.** When an element joins a family with an existing prefix, extend rather than introduce a parallel.
- **Tile-root prefix.** Tile root elements use `codap-{tile-type}`. Inner testids do NOT contain the tile instance id. Plugins resolve tile identity via the CODAP-1232 `componentId` payload; tests select tile roots directly via `[data-testid="codap-{tile-type}"]`. The `codap-` prefix is also used on many non-tile element families (menu bar, modal headers, attribute buttons, inspector palette), so prefix-match selectors like `[data-testid^="codap-"]` are NOT reliable tile-root anchors.
- **Index conventions.** Zero-based, render order, visible-only; fixed-semantic indices by fixed role.
- **Accessible name.** Visible text → `aria-label` → `aria-labelledby`. Add `aria-label` on icon-only / SVG swatches; never where visible text already serves.
- **`data-role` for non-ARIA classification.** D3/SVG elements that CODAP-1232 needs to classify but lack a natural ARIA role carry `data-role="{kind}"` instead.
- **Chakra `<Menu>` and `<Modal>` render no DOM.** Attach `data-testid` on `<MenuList>` / `<ModalContent>` etc.
- **`IMenuItem.dataTestId`.** Required field distinct from `itemKey` (the i18n translation key).

### R9 — Acceptance criteria

- Every element in R4 / R4.1 / R4.2 / R4.3 / R4.4 carries its proposed testid in the running app.
- R2 ESLint rule is in place at `v3/eslint-rules/codap-require-testid.cjs`, registered in the lint config. A clean `npm run lint` on the PR branch passes with the rule enabled.
- The rule's target-element list matches R2 with the documented skips.
- Opening every menu / palette / dialog on the Mammals example document reveals a stable testid on the container.
- Indexed testids have an accessible name source; SVG swatches and icon-only elements get `aria-label`.
- D3/SVG role commitments are in place (legend `role="img"`, selection marquee `role="presentation"`, axis drag rects `data-role="axis-drag-rect"`).
- Full Cypress regression run (triggered via `run regression` label) passes. Jest suite passes on CI. Both complete before PR is marked "Ready for Review."
- Convention documented per R8.

## Technical Notes

- **codap-modal.tsx**: already accepts a `data-testid` prop but only places it on the Modal root (which renders no DOM) — R2 extends it to forward `data-testid` onto `ModalContent`.
- **Tile-root identification**: The `codap-{tile-type}` testid on tile root containers gives each tile a stable direct selector. Plugins get tile identity from CODAP-1232's `componentId` payload, not from DOM walking.
- **React-Aria components**: The inspector popovers use React-Aria, not Chakra. Set `data-testid` directly on the React-Aria component.
- **D3/SVG elements**: Testids are set via `.attr("data-testid", …)`.
- **Localization**: CODAP uses translatable strings for many button labels (the source of the space-in-testid bug). Derive testids from action identifiers, not translated labels.

## Out of Scope

- **CFM library changes** — tracked separately against the CloudFileManager repo.
- **The notification manager itself** (CODAP-1232).
- **Tutorial plugin examples** (CODAP-1227 / 1228 / 1229 / 1230).
- **Non-menu / non-modal Chakra primitives** (Popover, Tooltip, Drawer) unless surfaced as blockers.
- **Rewriting tests that are currently passing** beyond the minimal updates required for the renames in R7.
- **Per-point testids on graph and map data marks.** Graph and map points are rendered via PixiJS (WebGL) — no per-point DOM element to carry a `data-testid`. Dedicated notification-API surface needed in CODAP-1232.

### Coordination with CODAP-1232

Plugins run inside iframes and cannot query CODAP's DOM. This spec commits to placing the human-readable name on `aria-label` at the DOM element for every indexed testid. The CODAP-1232 notification system reads the `aria-label` and includes the resolved name in the payload.

CODAP-1232 classifies event *type* using this resolution order:
1. Native ARIA `role` attribute.
2. **`data-role`** attribute — for CODAP-owned classifications where a native ARIA role would be misleading (e.g. axis drag rects `data-role="axis-drag-rect"` — mouse-only, so ARIA `role="button"` would mislead SR users about keyboard operability).
3. If neither is set, CODAP-1232 emits a generic "interaction" event.

CODAP-1232 resolves the *name* to include in its payload using:
1. Visible text content of the element.
2. `aria-label` attribute.
3. `aria-labelledby` target's text content.
4. Omit `name` field otherwise.

**Non-DOM notification channels.** Data-selection changes (cases selected by marquee drag, table cell click, graph point click) flow through CODAP-1232's separate data-selection notification path, not via DOM events on the visual elements. The `selection-marquee` testid in R4.1 is Cypress-only; it is not a plugin anchor.

**Downstream expectation** (not a pre-merge gate): once this PR lands, CODAP-1232's notification manager should be able to use `[data-testid]` as its primary fast-path filter.

## Decisions

### CONTRIBUTING.md location
**Context**: No `CONTRIBUTING.md` exists today. Ticket mentioned documenting the convention in both `CLAUDE.md` and `CONTRIBUTING.md`.
**Options considered**:
- A) Create `v3/CONTRIBUTING.md` scoped to v3.
- B) Create `CONTRIBUTING.md` at repo root.
- C) Skip CONTRIBUTING.md; document in `CLAUDE.md` only.

**Decision**: **C** — `CLAUDE.md` is the canonical contributor reference for this repo.

### Migration strategy for renamed testids
**Context**: Renames like `tiles-list-menu` → `tool-shelf-tiles-menu-list` and `legend-key` → `legend-key-{value}` are breaking changes for downstream consumers.
**Options considered**:
- A) Big-bang rename: drop the old testid; update all in-repo callers.
- B) Dual-path for one release, then remove.
- C) Keep the old testid indefinitely.

**Decision**: **A** — big-bang rename. All in-repo callers updated in the same PR; downstream consumers adapt on upgrade.

### Space-in-testid fix strategy
**Context**: Dynamic testids with translated-label interpolation (`` `${b.label}-button` ``) break attribute selectors and violate locale-independence.
**Options considered**:
- A) Replace label interpolation with a stable action identifier via a `testId` field on button config objects.
- B) Sanitize the label at runtime — still locale-sensitive.
- C) Use attribute/collection id instead of the name.

**Decision**: **A** — stable action identifier. Locale-independent and future-proof.

### Dev-mode assertion or lint rule
**Context**: The ticket listed this as optional. Goal is preventing future regressions on testid coverage.
**Options considered**:
- A) Required-prop at type level.
- B) Runtime dev-mode `console.warn`.
- C) ESLint rule flagging missing `data-testid` on render-targets.
- D) Skip; rely on code review.

**Decision**: **C** — ESLint rule applied to `MenuList` / `MenuItem` / `MenuButton` / `ModalContent` from `@chakra-ui/react`, plus native interactive, React-Aria, clickable anchors, dialog/panel wrappers, and MenuItem-classed divs. Recorded as R2.

### Tile-scoping strategy (`{tileId}` instability)
**Context**: Tile instance ids are regenerated each document load, so testids containing `{tileId}` aren't stable across sessions. Original spec proposed `{thing}-{tileId}` to make plugin notification payloads self-describing.
**Options considered**:
- A) Keep `{thing}-{tileId}` as proposed.
- B) Drop `{tileId}` entirely. Plugins get tile identity from CODAP-1232 payload; tests/plugins walk up via `closest('[data-testid^="codap-"]')`.
- C) Hybrid: tileId only on tile root container; inner testids unscoped.
- D) Stable-per-tile-type suffix.

**Decision**: **B** — drop `{tileId}` entirely. Testids stay short and stable across sessions. Later refined (see SE8 below): the `closest('[data-testid^="codap-"]')` walk was documented out of the spec because the `codap-` prefix is used broadly across non-tile elements. Tests select tile-type-specific roots directly via `[data-testid="codap-{tile-type}"]`.

### Sweep completeness bar
**Context**: How exhaustive does the sweep of `v3/src/components/` need to be?
**Options considered**:
- A) Every user-interactive element in the Mammals example document.
- B) Every user-interactive element across all example documents.
- C) Every interactive element reachable by normal user flows.
- D) Every Chakra Menu/Modal/MenuItem/MenuButton call site plus Mammals sweep.

**Decision**: Custom — inspect every source file under `v3/src/components/` that renders user-visible interactive UI. Source tree is the inventory; Mammals probing is a post-sweep sanity check.

### Interpolated user-data in testids
**Context**: `attribute-header-menu-{attrName}` and `legend-key-{value}` would violate "no spaces" when attribute names or category values contain spaces (`"new height"`, `"South America"`).
**Options considered**:
- A) Use the stable id instead of the name.
- B) Sanitize at runtime.
- C) Keep the name; rely on selector quoting.
- D) Index for data-bound part + `aria-label` for human-readable.

**Decision**: **D with index only** — interpolate the index (position within the collection / legend) rather than the attribute id or category value. Pair with an accessible name source. CODAP-1232 resolves the name via visible text → `aria-label` → `aria-labelledby`.

### Existing `codap-inspector-palette` Cypress callers
**Context**: With the inspector palette rename to `inspector-palette-{tile-type}`, Cypress support files in graph-tile.ts, map-tile.ts, slider-tile.ts use the old form.
**Options considered**:
- A) Update Cypress support files to construct tile-type-specific selector.
- B) Keep `codap-inspector-palette` as a secondary (duplicate) testid.
- C) Emit only the new scoped testid and update all call sites.

**Decision**: **A** — each Cypress tile element file updates to its tile-type-specific selector. Combined with big-bang rename decision, the old testid is dropped.

### Chakra propagates `data-testid` to DOM
**Context**: Verifying that `<MenuList data-testid="foo">` renders `<div data-testid="foo">`.
**Decision**: Source-level audit of `@chakra-ui/react@2.8.2` confirmed `MenuList`, `MenuItem`, `MenuButton`, and `ModalContent` all spread props onto the underlying rendered DOM. `Menu` and `Modal` render no DOM. The spec requires `data-testid` on each render-target component directly; the ESLint rule enforces this.

### `{attrIndex}` / `{collectionIndex}` semantics
**Context**: Zero-based vs. one-based? Hidden/set-aside counted? Storage order vs. render order?

**Decision**: R1 gained an "Index conventions" block defining zero-based, render-order, visible-only, stable-within-render-pass — plus a fixed-semantic-index exception for cases like axis drag rects where 0/1/2 are permanent roles.

### `{itemKey}` ambiguity for test authors
**Context**: R4.1 uses `{itemKey}` for menu-item testids, but Cypress test authors have no way to know what strings those resolve to.

**Decision**: Keep `itemKey` as the i18n translation key; add a required parallel `dataTestId: string` field to `IMenuItem`. R4.1 rows for index/attribute MenuItems now enumerate the `dataTestId` values directly (e.g. `index-menu-insert-case`, `attribute-menu-rename`).
