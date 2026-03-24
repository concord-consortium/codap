# CODAP-1150: Color Picker Accessibility Migration

## Summary

Migrate color picker components from Chakra UI to React Aria to achieve basic accessibility (focus management, keyboard navigation, ARIA semantics). Incorporate easy design wins from the Zeplin spec (8×2 grid layout, visible checkmark). Defer new features (RGB inputs, alpha inputs, eyedropper, custom slider styling).

## Goals

1. **Accessibility**: Focus-into-popover on open, focus-return-to-trigger on close, keyboard arrow-key navigation within the swatch grid, proper ARIA semantics.
2. **Simplification**: Eliminate manual positioning logic (`adjustPosition()`, resize listener, placement state) by using React Aria's built-in popover positioning.
3. **Design alignment**: Update swatch grid from 4×4 to 8×2 layout per Zeplin spec.

## Non-Goals (Deferred)

- RGB/Alpha numeric input fields
- Eyedropper tool
- Custom slider styling for react-colorful
- Any other new features from the Zeplin spec

## Approach

Replace Chakra UI popover/button components with React Aria `DialogTrigger` + `Popover` + `Dialog` pattern. This is a new pattern in the codebase (the existing `legend-color-controls.tsx` uses React Aria `Select` + `Popover` + `ListBox`, which is a different pattern for dropdown selection). Replace the swatch grid with a React Aria `RadioGroup` for single-selection keyboard navigation.

Note: The swatch grid changes from `aria-pressed` toggle buttons to `RadioGroup` + `Radio` items. This is semantically appropriate because the current implementation does not support deselection — clicking a swatch always selects it. Radio semantics (exactly one selected) match the actual behavior.

## Component Architecture

### PointColorSetting (trigger)

**Current**: Chakra `Popover` + `PopoverTrigger` + `Portal`, manual open/close state (`openPopover` string), `useOutsidePointerDown` hook.

**After**: React Aria `DialogTrigger` + `Button` + `Popover` + `Dialog`. Use controlled mode (`isOpen`/`onOpenChange`) to support the `closeTrigger` prop, which allows external code (e.g., categorical color list scrolling) to programmatically close the popover. The swatch button becomes a React Aria `Button` with existing ARIA attributes (`aria-label`, `aria-expanded`, `aria-haspopup="dialog"`). React Aria handles:
- Focus moves into popover on open
- Focus returns to trigger on close
- Escape and outside-click dismissal

**Eliminated**: `useOutsidePointerDown` hook, manual `openPopover` state management.

### ColorPickerPalette (palette content)

**Current**: Chakra `PopoverContent` + `PopoverBody` + `PopoverArrow` + `Button` + `ButtonGroup` + `Flex`. Manual `adjustPosition()` function (~30 lines) with viewport collision detection, window resize listener, placement/offset state. Accepts `showArrow`, `placement`, `setPlacement`, and `buttonRef` props for positioning.

**After**: Lives inside the React Aria `Dialog`. The 16-color swatch grid becomes a `RadioGroup` with `Radio` items arranged in an 8×2 CSS grid. When the current color doesn't match any palette color, a 17th swatch is rendered as an additional `Radio` item in a partial third row (matching the current behavior of showing the non-standard color). The selected swatch gets a visible checkmark indicator (CSS `::after` pseudo-element or SVG). The "More"/"Less" toggle and the local `ColorPicker` wrapper (which renders react-colorful's `HexAlphaColorPicker`) stay as-is. Accept/reject button flow unchanged.

**Eliminated**: `adjustPosition()` function, resize event listener, `placement`/`setPlacement`/`showArrow`/`buttonRef` props (positioning now handled by React Aria at the `Popover` level in the parent component), SCSS position exports (`colorPickerPopoverTop`, `colorPickerPopoverLeft`), Chakra `PopoverArrow`.

**Cleanup**: Remove unused `initialColor` prop (declared in interface and destructured but never referenced in component logic).

### ColorTextEditor (case card inline editor)

**Current**: Chakra `Popover` + `PopoverAnchor` + `PopoverTrigger` + `Portal` + `useDisclosure` + `useOutsidePointerDown`. The `useOutsidePointerDown` hook triggers `acceptValue()` on outside click (submitting the current value), not just closing the popover.

**After**: React Aria `DialogTrigger` + `Popover` + `Dialog` in controlled mode. Use `onOpenChange(isOpen)` — when `isOpen` becomes `false` due to outside click, call `acceptValue()` to preserve the submit-on-outside-click behavior. Eliminates `useDisclosure` and `useOutsidePointerDown`. The `placement` state management for left/right positioning is eliminated (React Aria handles positioning automatically).

### ColorCellTextEditor (case table inline editor)

**Current**: Similar to `ColorTextEditor` but integrated with ReactDataGrid lifecycle (row/column props, logging, UI state, case selection). Unlike `ColorTextEditor`, does **not** use `useOutsidePointerDown` — uses Chakra's `closeOnBlur={false}` and relies on ReactDataGrid's own lifecycle for editor dismissal.

**After**: React Aria `DialogTrigger` + `Popover` + `Dialog` in controlled mode. No submit-on-outside-click behavior needed (ReactDataGrid manages editor lifecycle). ReactDataGrid integration, logging, and UI state management unchanged.

## Focus Management

| Event | Behavior |
|---|---|
| Popover opens | React Aria auto-focuses first focusable element in Dialog (selected swatch radio, or first swatch if none selected) |
| Escape pressed | React Aria closes popover, returns focus to trigger button, rejects color change |
| Outside click | React Aria closes popover, returns focus to trigger button. In ColorTextEditor/ColorCellTextEditor, also submits the current value. |
| Arrow keys in grid | RadioGroup handles navigation between swatches |
| Tab within popover (collapsed) | Swatch grid → More/Less button |
| Tab within popover (expanded) | Swatch grid → More/Less button → react-colorful picker → Cancel → OK |

## Layout Changes

| Property | Current | New (Zeplin spec) |
|---|---|---|
| Grid layout | 4×4 | 8×2 |
| Swatch size | 18×18 | 22×22 |
| Swatch gap | (mixed) | 5px |
| Palette padding | (mixed) | 12px |
| Palette width | 108px (222px expanded) | 235px |

## What Stays Unchanged

- react-colorful `HexAlphaColorPicker` via local `ColorPicker` wrapper (has adequate keyboard and ARIA support)
- Color parsing utilities (`parseColor()`)
- Accept/reject/cancel callback flow
- Logging integration in `ColorCellTextEditor`
- ReactDataGrid integration in `ColorCellTextEditor`
- `closeTrigger` prop behavior in `PointColorSetting` (implemented via controlled `isOpen` state)

## Files Modified

| File | Scope |
|---|---|
| `src/components/data-display/inspector/point-color-setting.tsx` | Replace Chakra popover with React Aria DialogTrigger |
| `src/components/data-display/inspector/point-color-setting.test.tsx` | Update mocks and assertions for React Aria |
| `src/components/common/color-picker-palette.tsx` | Replace Chakra components, delete adjustPosition, RadioGroup for swatches, remove positioning props |
| `src/components/common/color-picker-palette.scss` | Update grid layout, remove position exports |
| `src/components/common/color-picker-palette.scss.d.ts` | Remove position export declarations (or delete file if no exports remain) |
| `src/components/case-tile-common/color-text-editor.tsx` | Replace Chakra popover with React Aria, preserve submit-on-outside-click |
| `src/components/case-tile-common/color-text-editor.scss` | Minor adjustments if needed |
| `src/components/case-table/color-cell-text-editor.tsx` | Replace Chakra popover with React Aria |

## Risk

- **react-colorful tab integration**: The react-colorful picker must participate in the tab order within the Dialog. Since it renders standard interactive elements (the saturation area and sliders), this should work naturally, but needs verification.
- **Popover positioning edge cases**: React Aria's `Popover` uses `@react-aria/overlays` for positioning. The current `adjustPosition()` handles specific viewport-edge cases. React Aria should handle these automatically, but the inspector panel context (popover opening from within a narrow side panel) needs testing.
- **ColorCellTextEditor anchor positioning**: The current implementation anchors the popover to the text input via Chakra's `PopoverAnchor`. React Aria's equivalent positioning needs verification within the ReactDataGrid cell context.
- **Submit-on-outside-click in ColorTextEditor**: The `onOpenChange` callback must distinguish between Escape (cancel) and outside click (submit). React Aria may need additional handling to differentiate these dismissal modes. This applies only to `ColorTextEditor`; `ColorCellTextEditor` does not have submit-on-outside-click behavior.
