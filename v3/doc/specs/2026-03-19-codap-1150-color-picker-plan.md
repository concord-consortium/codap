# CODAP-1150: Color Picker Accessibility Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate color picker from Chakra UI to React Aria for accessible focus management, keyboard navigation, and ARIA semantics.

**Architecture:** Replace Chakra Popover with React Aria `DialogTrigger` + `Popover` + `Dialog`. Replace swatch grid buttons with React Aria `RadioGroup` + `Radio`. Delete manual positioning logic. Update layout from 4×4 to 8×2 per Zeplin spec.

**Tech Stack:** React Aria Components (`react-aria-components`), react-colorful (unchanged), CSS Grid

**Spec:** `v3/doc/specs/2026-03-19-codap-1150-color-picker-a11y-design.md`

---

## Current Status (2026-03-24)

**Branch:** `CODAP-1150-color-picker-react-aria` (8 commits ahead of main)

**All migration tasks are complete.** TypeScript builds clean, lint clean, all 2389 tests pass (including 15 new ColorPickerPalette tests and 3 new PointColorSetting tests). Manual testing revealed bugs that need fixing before the PR is ready for review.

### Known Bugs

**Bug 1: Gray border on palette (cosmetic)**
The palette has a visible `1px solid #d0d0d0` border that doesn't match the Zeplin design spec. The spec shows a clean white dropdown with a subtle shadow instead. Fix: in `color-picker-palette.scss`, replace `border: 1px solid $border-color` with an appropriate `box-shadow` (e.g., `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)`).

**Bug 2: Tab only cycles between custom swatch and More button (behavioral)**
When a non-standard color is selected (the 17th swatch), Tab cycles between the custom swatch and the More button, never reaching the 16 default swatches. This is technically correct per ARIA radio group semantics (a RadioGroup is a single tab stop; arrow keys navigate within it), but it may be surprising. The 16 default swatches are reachable only via arrow keys from the selected swatch.

**Bug 3: Arrow keys lose the custom color (serious)**
When a non-standard color is selected (17th swatch), pressing arrow keys to navigate into the 16 default swatches immediately triggers `onChange`/`onColorChange`, which changes the `swatchBackgroundColor`. This causes `nonStandardColorSelected` to become false, removing the 17th swatch from the DOM. The user cannot arrow back to their custom color.

Root cause: React Aria `RadioGroup` fires `onChange` on arrow key navigation (selection follows focus), and `ColorPickerPalette`'s `nonStandardColorSelected` is derived from `swatchBackgroundColor` which gets updated by the parent via `onColorChange`.

Possible fixes:
- Track the non-standard color separately (e.g., in a ref or state that persists even when the user navigates away) so the 17th swatch stays in the DOM until accept/reject
- Or switch from RadioGroup (selection follows focus) to a different pattern where focus and selection are independent (e.g., `ListBox` with `selectionMode="single"` which separates focus from selection, or a custom grid with `role="grid"` and manual arrow key handling)

### Implementation Deviations from Original Plan

1. **FormatTextColorButton** (`src/components/text/format-text-color-button.tsx`) was not in the original plan. Discovered during Task 1 code review as a 5th caller of `ColorPickerPalette`. It was migrated using standalone React Aria `Popover` with `triggerRef` (not `DialogTrigger`) because `InspectorButton` already wraps a React Aria Button inside a `TooltipTrigger`.

2. **ColorTextEditor** kept `useOutsidePointerDown` on the outer editor div. The plan originally suggested removing it, but it serves editor-level submit-on-outside-click (clicking outside the entire editor submits the value), which is a different concern from the palette popover dismiss.

3. **React Aria Radio structure**: `Radio` renders `className` on a `<label>` wrapper, not the `<input role="radio">`. This affects CSS selectors (`[data-selected]`, `[data-focus-visible]`, `.light`) and test assertions (tests use `.closest("label")` to find the styled element). The SCSS targets these correctly but this is worth knowing.

4. **`isPaletteOpen` prop removed** from `ColorPickerPalette` (was in the original plan interface but turned out to be unused after removing `adjustPosition`).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/common/color-picker-palette.tsx` | Rewrite | Swatch RadioGroup, remove Chakra internals, remove adjustPosition, remove positioning props |
| `src/components/common/color-picker-palette.scss` | Rewrite | 8×2 grid, 22×22 swatches, 235px width, remove :export block |
| `src/components/common/color-picker-palette.scss.d.ts` | Delete | Position exports no longer needed |
| `src/components/data-display/inspector/point-color-setting.tsx` | Rewrite | React Aria DialogTrigger + Popover + Dialog, controlled open state |
| `src/components/data-display/inspector/point-color-setting.test.tsx` | Rewrite | Update mocks and assertions for React Aria |
| `src/components/case-tile-common/color-text-editor.tsx` | Rewrite | React Aria DialogTrigger + Popover + Dialog, submit-on-outside-click |
| `src/components/case-tile-common/color-text-editor.scss` | Minor edit | Adjust if needed for React Aria class names |
| `src/components/case-table/color-cell-text-editor.tsx` | Rewrite | React Aria DialogTrigger + Popover + Dialog |
| `src/components/text/format-text-color-button.tsx` | Rewrite | React Aria Popover + Dialog with triggerRef (not DialogTrigger) |
| `src/components/common/color-picker-palette.test.tsx` | Created | 15 tests for RadioGroup, swatches, More/Less, Accept/Reject |

---

## Task 1: Migrate ColorPickerPalette to React Aria

This is the innermost component. Replace Chakra `PopoverContent`, `PopoverBody`, `PopoverArrow`, `Button`, `ButtonGroup`, `Flex` with plain HTML and React Aria `RadioGroup`/`Radio` for the swatch grid. Remove all positioning logic since React Aria Popover (added in Task 2) handles positioning.

**Files:**
- Modify: `src/components/common/color-picker-palette.tsx`
- Modify: `src/components/common/color-picker-palette.scss`
- Delete: `src/components/common/color-picker-palette.scss.d.ts`

### Step-by-step

- [ ] **Step 1.1: Read the current files**

Read `color-picker-palette.tsx`, `color-picker-palette.scss`, and `color-picker-palette.scss.d.ts` to understand the current implementation before making changes.

- [ ] **Step 1.2: Update the component interface**

Remove positioning props that are no longer needed. The new interface should be:

```typescript
interface IColorPickerPaletteProps {
  swatchBackgroundColor: string
  inputValue: string
  isPaletteOpen: boolean
  onColorChange: (color: string) => void
  onAccept: (color: string) => void
  onReject: () => void
  onUpdateValue: (value: string) => void
}
```

Props removed: `initialColor` (unused), `buttonRef`, `placement`, `setPlacement`, `showArrow`.

- [ ] **Step 1.3: Replace swatch grid with RadioGroup**

Replace the current `<div className="color-swatch-grid" role="group">` containing `<button>` elements with a React Aria `RadioGroup` + `Radio` components.

```tsx
import { Radio, RadioGroup } from "react-aria-components"
```

The RadioGroup:
- `aria-label={t("DG.Inspector.colorPicker.swatchGrid")}` (this translation string already exists)
- `value={selectedColor}` — controlled by the current swatch background color
- `onChange={handleColorSelection}` — calls `onColorChange`. Note: verify the exact callback prop name against the installed version of `react-aria-components` (may be `onChange` or `onSelectionChange`)

Each Radio:
- `value={color}` — the hex color string
- `aria-label={colorName}` — human-readable color name (keep existing logic)
- Renders a swatch `<div>` styled with `background-color`
- Selected state shown via a visible checkmark (CSS `::after` pseudo-element)

The 17th non-standard color swatch (when current color is not in the palette) is included as an additional Radio item.

- [ ] **Step 1.4: Replace Chakra Button/ButtonGroup/Flex with plain HTML**

- The "More"/"Less" toggle: replace Chakra `Button` with a plain `<button>` with appropriate class name
- The accept/reject buttons: replace Chakra `ButtonGroup` + `Button` with plain `<div>` + `<button>` elements
- Replace Chakra `Flex` wrappers with plain `<div>` elements with flex CSS

- [ ] **Step 1.5: Remove PopoverContent/PopoverBody/PopoverArrow wrappers**

The component should no longer render Chakra popover wrapper elements. The component now renders its content directly — the parent (`PointColorSetting`, migrated in Task 2) wraps it in a React Aria `Dialog`/`Popover`.

Remove the Chakra imports:
```typescript
// DELETE these imports
import { Button, ButtonGroup, Flex, PopoverArrow, PopoverBody, PopoverContent } from "@chakra-ui/react"
```

**Escape key handling:** The current component has a `handleKeyDown` that catches Escape and calls `onReject()`. Once wrapped in a React Aria `Dialog`, React Aria will also handle Escape to close the popover (triggering the parent's `onOpenChange`). Remove the Escape handler from `ColorPickerPalette` — let the parent's `onOpenChange` handler call `onReject` on dismiss. This avoids double-firing reject.

- [ ] **Step 1.6: Delete adjustPosition and all positioning logic**

Remove:
- The `adjustPosition()` function (~30 lines)
- The `useEffect` that calls `adjustPosition`
- The window resize event listener
- The `popoverRef` ref
- All position-related local variables and CSS style assignments
- The SCSS `:export` block and its TypeScript declaration file

- [ ] **Step 1.7: Update SCSS for 8×2 grid layout**

Rewrite `color-picker-palette.scss`. The current file uses `@use "../vars"` — maintain this convention (not `@import`, which is deprecated). All variable references must use the `vars.` namespace prefix (e.g., `vars.$focus-outline-color`). Check `vars.scss` for available variables — the current SCSS uses `vars.$charcoal-light-1` and `vars.$focus-outline-color`.

Key layout changes:
- 8-column grid: `grid-template-columns: repeat(8, 22px)`
- 22px swatches with 5px gaps
- 12px padding
- 235px palette width
- React Aria Radio data attributes: `[data-selected]` for selected state, `[data-focus-visible]` for focus
- Checkmark indicator on selected swatch (preserve existing background-image approach if it looks better than CSS `::after`)

Remove the `:export` block (position variables no longer needed).

- [ ] **Step 1.8: Delete the SCSS declarations file**

Delete `src/components/common/color-picker-palette.scss.d.ts` since the `:export` block is removed.

- [ ] **Step 1.9: Verify the build compiles**

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm run build:tsc`

This will fail because `PointColorSetting` and the text editors still pass the removed props. That's expected — they get migrated in Tasks 2-4. But the ColorPickerPalette component itself should have no TypeScript errors.

If there are errors in `color-picker-palette.tsx` itself, fix them before proceeding.

- [ ] **Step 1.10: Commit**

```bash
git add src/components/common/color-picker-palette.tsx \
       src/components/common/color-picker-palette.scss
git rm src/components/common/color-picker-palette.scss.d.ts
git commit -m "refactor: migrate ColorPickerPalette from Chakra to React Aria RadioGroup

Replace Chakra PopoverContent/PopoverBody/Button/ButtonGroup/Flex with
plain HTML and React Aria RadioGroup/Radio for swatch grid. Delete
adjustPosition() and all manual positioning logic. Update grid layout
from 4x4 to 8x2 per Zeplin spec (22px swatches, 5px gaps, 235px width).

Part of CODAP-1150."
```

---

## Task 2: Migrate PointColorSetting to React Aria DialogTrigger

Replace the Chakra Popover wrapper with React Aria `DialogTrigger` + `Popover` + `Dialog`. This is the primary trigger component used by the graph inspector and map.

**Files:**
- Modify: `src/components/data-display/inspector/point-color-setting.tsx`
- Modify: `src/components/data-display/inspector/point-color-setting.test.tsx`

### Step-by-step

- [ ] **Step 2.1: Read the current files**

Read `point-color-setting.tsx` and `point-color-setting.test.tsx`.

- [ ] **Step 2.2: Rewrite PointColorSetting with React Aria**

Replace the component implementation:

```tsx
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components"
```

Key changes:
- `DialogTrigger` wraps the swatch `Button` and `Popover`
- Use controlled mode: `isOpen={isOpen}` / `onOpenChange={setIsOpen}` to support `closeTrigger`
- The `closeTrigger` `useEffect` calls `setIsOpen(false)` instead of `setOpenPopover(null)`
- React Aria `Button` replaces the manual `<button>` with ARIA attributes
- React Aria `Popover` replaces Chakra `Portal` — provides automatic positioning and portal behavior
- React Aria `Dialog` wraps `ColorPickerPalette` inside the Popover
- Remove `useOutsidePointerDown` — React Aria handles outside-click dismissal
- Remove the `openPopover` string state — replace with boolean `isOpen`
- The `onOpenChange` handler: when closing (isOpen becomes false), call `onReject` to restore initial color (matching current behavior where outside-click rejects)
- Keep the `initialColorRef` for reject behavior
- Remove the `buttonRef` prop passed to `ColorPickerPalette` (no longer needed)
- Remove `placement`/`setPlacement` state (no longer needed)
- Keep the `disabled` prop support via React Aria Button's `isDisabled`
- Swatch button: keep the `.color-picker-thumb` class and swatch styling. Use React Aria `Button`'s render props for `data-pressed`/`data-selected` states if needed, but the main visual is the swatch color.

The `closeTrigger` useEffect stays but simplified:
```tsx
useEffect(() => {
  if (closeTrigger) {
    setIsOpen(false)
  }
}, [closeTrigger])
```

Handle the open/close + reject logic:
```tsx
const handleOpenChange = (open: boolean) => {
  if (open) {
    initialColorRef.current = swatchBackgroundColor
  } else {
    // Closing without explicit accept — reject
    handleRejectColor()
  }
  setIsOpen(open)
}
```

The `handleAcceptColor` should call `setIsOpen(false)` but NOT trigger reject. Use a ref or state flag to distinguish accept-close from dismiss-close:
```tsx
const isAcceptingRef = useRef(false)

const handleAcceptColor = () => {
  isAcceptingRef.current = true
  setIsOpen(false)
}

const handleOpenChange = (open: boolean) => {
  if (open) {
    initialColorRef.current = swatchBackgroundColor
    isAcceptingRef.current = false
  } else if (!isAcceptingRef.current) {
    handleRejectColor()
  }
  setIsOpen(open)
}
```

- [ ] **Step 2.3: Update the test file**

Rewrite `point-color-setting.test.tsx`:

- Remove Chakra Popover/PopoverTrigger/Portal mocks
- Mock `react-aria-components` if needed, or test against the real components (preferred if possible)
- Update selectors: the trigger button will have React Aria's generated attributes
- Keep the same test coverage: swatch rendering, ARIA attributes, open/close toggle, color change callbacks, closeTrigger behavior
- Add new tests for: focus management (focus moves to palette on open, returns to button on close), Escape key closes and rejects

- [ ] **Step 2.4: Run tests**

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm test -- point-color-setting`

Fix any failures.

- [ ] **Step 2.5: Verify type check**

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm run build:tsc`

There will still be errors in `color-text-editor.tsx` and `color-cell-text-editor.tsx` because they still pass removed props to ColorPickerPalette. That's expected — they get migrated in Tasks 3-4. Verify there are no errors in `point-color-setting.tsx` itself.

- [ ] **Step 2.6: Manual smoke test**

Start the dev server (`npm start`) and test:
1. Open a graph with data, open the Format inspector palette
2. Click a Fill Color swatch — palette should open with focus on the selected color
3. Arrow keys should navigate between swatches
4. Press Escape — palette should close, focus should return to the swatch button, color should revert
5. Click a swatch — color should change immediately
6. Click "More" — color picker should expand
7. Click outside the palette — should close and reject
8. Test with categorical legend colors (scroll should close via closeTrigger)

- [ ] **Step 2.7: Commit**

```bash
git add src/components/data-display/inspector/point-color-setting.tsx \
       src/components/data-display/inspector/point-color-setting.test.tsx
git commit -m "refactor: migrate PointColorSetting from Chakra to React Aria

Replace Chakra Popover/PopoverTrigger/Portal with React Aria
DialogTrigger/Popover/Dialog. Controlled open state supports
closeTrigger prop. Remove useOutsidePointerDown — React Aria handles
dismiss on outside click. Focus management automatic.

Part of CODAP-1150."
```

---

## Task 3: Migrate ColorTextEditor to React Aria

Replace Chakra Popover in the case card inline color editor. Key concern: preserve submit-on-outside-click behavior.

**Files:**
- Modify: `src/components/case-tile-common/color-text-editor.tsx`
- Modify: `src/components/case-tile-common/color-text-editor.scss` (if needed)

### Step-by-step

- [ ] **Step 3.1: Read the current file**

Read `color-text-editor.tsx` and `color-text-editor.scss`.

- [ ] **Step 3.2: Rewrite ColorTextEditor with React Aria**

Replace Chakra components:

```tsx
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components"
```

Key changes:
- Replace Chakra `Popover` + `PopoverTrigger` + `PopoverAnchor` + `Portal` + `useDisclosure` with React Aria `DialogTrigger` + `Popover` + `Dialog`
- Use controlled mode: `isOpen` / `onOpenChange`
- Remove `useOutsidePointerDown` — use `onOpenChange` to handle outside-click
- Remove `placement` / `setPlacement` state
- Replace Chakra `forwardRef` with React's `forwardRef`. Replace Chakra `useMergeRefs` with a manual ref merge callback: `(el: HTMLElement | null) => { ref1.current = el; ref2.current = el }` or use React Aria's equivalent if available.
- Remove `showArrow`, `placement`/`setPlacement`, `buttonRef` props from ColorPickerPalette (no longer accepted)

**PopoverAnchor replacement:** The current implementation uses Chakra's `PopoverAnchor` to position the popover relative to the text input. With React Aria, the `Popover` positions relative to the `DialogTrigger`'s trigger element by default. If the trigger is the swatch button but the popover should anchor near the text input, use React Aria Popover's `triggerRef` prop to reference the input element, or restructure so the `DialogTrigger` wraps the input area.

**Escape vs. outside-click — use ref pattern:** The current code distinguishes Escape (calls `cancelChanges()` via `onKeyDown`) from outside-click (calls `acceptValue()` via `useOutsidePointerDown`). Preserve this with a `isCancellingRef` pattern:

```tsx
const isCancellingRef = useRef(false)

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Escape") {
    isCancellingRef.current = true
    cancelChanges()
    setIsOpen(false)
  }
}

const handleOpenChange = (open: boolean) => {
  if (!open && isOpen) {
    if (!isCancellingRef.current) {
      // Outside click — accept
      acceptValue(value)
    }
    isCancellingRef.current = false
  }
  setIsOpen(open)
}
```

- [ ] **Step 3.3: Run type check**

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm run build:tsc`

There may still be errors in `color-cell-text-editor.tsx` (Task 4). Verify no errors in `color-text-editor.tsx`.

- [ ] **Step 3.4: Manual smoke test**

1. Open a case card with a color attribute
2. Click the cell — text editor should appear with color swatch
3. Click the color swatch — palette should open
4. Select a color — should update the cell value
5. Press Escape — should cancel/reject
6. Click outside — should accept the current value
7. Verify focus management works correctly

- [ ] **Step 3.5: Commit**

```bash
git add src/components/case-tile-common/color-text-editor.tsx \
       src/components/case-tile-common/color-text-editor.scss
git commit -m "refactor: migrate ColorTextEditor from Chakra to React Aria

Replace Chakra Popover/PopoverAnchor/PopoverTrigger/Portal with React
Aria DialogTrigger/Popover/Dialog. Remove useOutsidePointerDown and
placement state. Preserve submit-on-outside-click via onOpenChange.

Part of CODAP-1150."
```

---

## Task 4: Migrate ColorCellTextEditor to React Aria

Replace Chakra Popover in the case table inline color editor. Simpler than Task 3 — no submit-on-outside-click behavior.

**Files:**
- Modify: `src/components/case-table/color-cell-text-editor.tsx`

### Step-by-step

- [ ] **Step 4.1: Read the current file**

Read `color-cell-text-editor.tsx`.

- [ ] **Step 4.2: Rewrite ColorCellTextEditor with React Aria**

Same pattern as Task 3 but simpler:

```tsx
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components"
```

Key changes:
- Replace Chakra `Popover` + `PopoverTrigger` + `PopoverAnchor` + `Portal` + `useDisclosure` with React Aria `DialogTrigger` + `Popover` + `Dialog`
- Remove `placement` / `setPlacement` state
- Replace Chakra `forwardRef` with React's `forwardRef`, replace `useMergeRefs` with manual ref merge callback (same pattern as Task 3)
- **PopoverAnchor replacement:** Same approach as Task 3 — use `triggerRef` prop or restructure trigger to anchor the popover correctly within the ReactDataGrid cell
- No `useOutsidePointerDown` to remove (this component doesn't use it)
- No Escape/outside-click distinction needed (ReactDataGrid manages editor lifecycle)
- Keep ReactDataGrid integration, logging, UI state management unchanged
- Remove positioning props passed to ColorPickerPalette

- [ ] **Step 4.3: Run type check and tests**

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm run build:tsc`

All TypeScript errors should now be resolved. No files should reference the removed ColorPickerPalette props.

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm test`

All tests should pass.

- [ ] **Step 4.4: Manual smoke test**

1. Open a case table with a color attribute
2. Double-click a color cell — editor should appear
3. Click the color swatch — palette should open
4. Select a color — should update the cell
5. Press Escape — should cancel
6. Verify focus management and keyboard navigation

- [ ] **Step 4.5: Commit**

```bash
git add src/components/case-table/color-cell-text-editor.tsx
git commit -m "refactor: migrate ColorCellTextEditor from Chakra to React Aria

Replace Chakra Popover/PopoverAnchor/PopoverTrigger/Portal with React
Aria DialogTrigger/Popover/Dialog. Remove placement state.

Part of CODAP-1150."
```

---

## Task 5: Verify translation strings

Most translation strings already exist. Verify and add only genuinely new ones.

**Files:**
- Modify: `src/utilities/translation/lang/en-US.json5` (only if new strings are needed)

### Step-by-step

- [ ] **Step 5.1: Verify existing translation strings**

The following keys already exist in `en-US.json5` and should be reused:
- `DG.Inspector.colorPicker.swatchGrid` — swatch grid aria-label
- `DG.Inspector.colorPicker.more` — "More" button (NOT `moreColors`)
- `DG.Inspector.colorPicker.less` — "Less" button (NOT `lessColors`)
- `V3.CaseTable.colorPalette.setColor` — accept/OK button
- `V3.CaseTable.colorPalette.cancel` — cancel/reject button

Search `en-US.json5` for `colorPicker` and `colorPalette` to confirm these exist and identify any gaps. Only add new strings if the migrated code introduces ARIA labels not covered by existing keys.

- [ ] **Step 5.2: Commit (if changes were needed)**

```bash
git add src/utilities/translation/lang/en-US.json5
git commit -m "chore: add translation strings for color picker accessibility

Part of CODAP-1150."
```

---

## Task 6: Run full test suite and lint

**Files:** None (verification only)

### Step-by-step

- [ ] **Step 6.1: Run lint**

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm run lint`

Fix any lint errors.

- [ ] **Step 6.2: Run full test suite**

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm test`

Fix any test failures.

- [ ] **Step 6.3: Run type check**

Run: `cd /Users/kswenson/Development/cc-dev/codap/v3 && npm run build:tsc`

Fix any type errors.

- [ ] **Step 6.4: Commit any fixes**

If lint/test fixes were needed, commit them:

```bash
git commit -m "fix: resolve lint and test issues from color picker migration

Part of CODAP-1150."
```

---

## Task 7: Cleanup and verify

### Step-by-step

- [ ] **Step 7.1: Verify no remaining Chakra imports in migrated files**

Search the migrated files for any remaining `@chakra-ui/react` imports:

```bash
grep -l "@chakra-ui/react" \
  src/components/common/color-picker-palette.tsx \
  src/components/data-display/inspector/point-color-setting.tsx \
  src/components/case-tile-common/color-text-editor.tsx \
  src/components/case-table/color-cell-text-editor.tsx
```

Should return no results.

- [ ] **Step 7.2: Verify useOutsidePointerDown is removed from migrated files**

```bash
grep -l "useOutsidePointerDown" \
  src/components/data-display/inspector/point-color-setting.tsx \
  src/components/case-tile-common/color-text-editor.tsx \
  src/components/case-table/color-cell-text-editor.tsx
```

Should return no results.

- [ ] **Step 7.3: Final manual smoke test**

Test all three entry points:
1. **Graph inspector**: Fill Color and Border Color swatches in Format palette
2. **Case card**: Color attribute cell editing
3. **Case table**: Color attribute cell editing
4. **Map**: Point color setting (shares graph inspector code path)

For each, verify:
- Palette opens with focus on selected swatch (or first swatch)
- Arrow keys navigate the swatch grid
- Tab moves through More/Less button and (if expanded) color picker, Cancel, OK
- Escape closes and rejects
- Outside click closes (and submits for text editors)
- Focus returns to trigger on close
- Colors update correctly on selection, accept, and reject

- [ ] **Step 7.4: Commit any final cleanup**

If any cleanup was needed, commit it.
