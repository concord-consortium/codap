# CODAP Guided Tour System: Design Document

**Stories:** CODAP-1167 (Tour/Highlight API), CODAP-1166 (Tutorial 1 Conversion)
**Date:** 2026-03-12
**Author:** Kirk Swenson

## Overview

CODAP has several tutorials that currently use a plugin with embedded screencast videos to guide users through basic tasks. This design covers adding a guided tour/highlight API to CODAP (using Driver.js) and converting the Getting Started tutorial (Tutorial 1) to use it as a proof of concept.

## Story Dependency

The Jira stories should be worked in this order (reversed from the original filing):

1. **CODAP-1167: Add a tour API to CODAP** — Design and implement the highlight/tour API as part of the CODAP plugin API. This is the infrastructure work.
2. **CODAP-1166: Tutorial 1 using guided tour library** — Use the API to enhance the Getting Started tutorial. This consumes the API.

## Library Choice: Driver.js

[Driver.js](https://driverjs.com/) has been selected as the guided tour library. Key characteristics:

- **Purely visual** — draws overlay/spotlight on target elements with optional popovers. Does not interact with the underlying application; the user performs actions themselves.
- **Two modes:**
  - **Single highlight** — spotlight one element with optional popover text
  - **Multi-step tour** — sequential steps with Next/Previous/Close navigation
- **Element targeting** — accepts CSS selectors, DOM elements, or functions returning DOM elements (lazy resolution)
- **User interaction preserved** — highlighted elements remain interactive by default (`disableActiveInteraction: false`)
- **Built-in keyboard support** — arrow keys and Escape for tour navigation
- **Programmatic control** — `drive()`, `moveNext()`, `movePrevious()`, `moveTo(n)`, `destroy()`, `highlight()`, `refresh()`
- **Event hooks** — `onHighlightStarted`, `onHighlighted`, `onDeselected`, `onNextClick`, `onPrevClick`, `onCloseClick`, `onDestroyed`
- **Configurable appearance** — overlay opacity/color, stage padding/radius, popover positioning, custom CSS classes, HTML content in popovers

Driver.js runs in the CODAP host frame (not in plugin iframes), since it needs access to CODAP's DOM to create overlays and highlight elements.

## API Design

### Targeting Scheme

A two-level approach leveraging existing infrastructure:

**Level 1 — Tile/component targeting** (already exists in the plugin API):
Plugins already identify tiles by title, name, or ID (e.g., `component[myGraph]`).

**Level 2 — Sub-element targeting within a tile** (new):
Uses existing `data-testid` attribute values as sub-element identifiers. This avoids creating a parallel attribute system and ensures test coverage and tour coverage grow together.

When a component is specified, the `data-testid` lookup is scoped to that component's DOM subtree, disambiguating cases where multiple tiles have the same sub-element (e.g., axis drop zones in two different graphs).

**Note:** Exposing `data-testid` values through the plugin API effectively promotes them from internal testing identifiers to part of the public API surface. Before finalizing this API, we should review the existing `data-testid` usage across the codebase for consistency in naming conventions, coverage of tour-relevant elements, and stability guarantees — since plugin authors will depend on these values not changing unexpectedly.

### API Surface

The API extends the existing `interactiveFrame` and `component` notify mechanisms:

#### Highlight a global element (toolbar, document-level)

```json
{
  "action": "notify",
  "resource": "interactiveFrame",
  "values": {
    "request": "highlight",
    "target": { "testId": "tool-shelf-button-graph" },
    "popover": {
      "title": "Make a Graph",
      "description": "Click this button to create a graph",
      "side": "bottom",
      "align": "center"
    }
  }
}
```

#### Highlight within a specific component

```json
{
  "action": "notify",
  "resource": "component[myGraph]",
  "values": {
    "request": "highlight",
    "target": { "testId": "add-attribute-drop-bottom" },
    "popover": {
      "description": "Drag an attribute here to assign it to the x-axis"
    }
  }
}
```

#### Multi-step tour

```json
{
  "action": "notify",
  "resource": "interactiveFrame",
  "values": {
    "request": "startTour",
    "tourId": "getting-started-make-graph",
    "steps": [
      {
        "target": { "testId": "tool-shelf-button-graph" },
        "popover": { "description": "Click to create a graph" }
      },
      {
        "component": "myGraph",
        "target": { "testId": "add-attribute-drop-bottom" },
        "popover": { "description": "Drag an attribute here" }
      }
    ]
  }
}
```

#### Clear highlight / End tour

```json
{
  "action": "notify",
  "resource": "interactiveFrame",
  "values": { "request": "clearHighlight" }
}
```

```json
{
  "action": "notify",
  "resource": "interactiveFrame",
  "values": { "request": "endTour" }
}
```

### Element Resolution

When CODAP receives a highlight/tour request:

1. Determine the target component (if any):
   - If the `resource` is of the form `component[<componentId>]`, use `<componentId>` as the component.
   - Otherwise, if `values.component` is provided (as in multi-step tour steps), use that as the component.
   - If neither is present, operate in the `interactiveFrame` / document-wide scope.
2. If a component was determined, resolve it to a tile DOM element using the existing tile registry.
3. Within that scope (the resolved tile or document-wide for `interactiveFrame`), find the element with the matching `data-testid`.
4. Pass the resolved DOM element to Driver.js using a function resolver (lazy evaluation handles elements that may not exist yet).

### Popover Options

Popover configuration maps directly to Driver.js options:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Popover heading (supports HTML) |
| `description` | string | Popover body text (supports HTML) |
| `side` | `"top" \| "right" \| "bottom" \| "left"` | Placement relative to target |
| `align` | `"start" \| "center" \| "end"` | Alignment along the side axis |

### Overlay and Styling Options

Plugins should be able to control the appearance of highlights and the overlay to whatever extent Driver.js allows. This includes scenarios where no overlay is desired (e.g., the user should still interact freely with the rest of the app while a callout is visible).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `overlayColor` | string | `"black"` | Backdrop color |
| `overlayOpacity` | number | `0.5` | Backdrop transparency (set to `0` for no visible overlay) |
| `stagePadding` | number | `10` | Space between highlighted element and cutout |
| `stageRadius` | number | `5` | Cutout corner radius |
| `popoverClass` | string | — | Custom CSS class for popover styling |
| `popoverOffset` | number | `10` | Distance between popover and target element |
| `animate` | boolean | `true` | Enable/disable transition animations |
| `smoothScroll` | boolean | `false` | Smooth scroll to highlighted elements |

These can be specified at the tour level (in `startTour`) or per-step, matching Driver.js's own override hierarchy.

### Tour Navigation Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showButtons` | string[] | `["next", "previous", "close"]` | Which navigation buttons to show |
| `showProgress` | boolean | false | Show step progress (e.g., "2 of 5") |
| `allowKeyboardControl` | boolean | true | Enable arrow key / Escape navigation |
| `overlayClickBehavior` | string | `"close"` | What happens on backdrop click |
| `disableActiveInteraction` | boolean | `false` | Block interaction with highlighted element |
| `allowClose` | boolean | `true` | Allow closing by clicking backdrop |

## Existing data-testid Coverage

A scan of the CODAP v3 codebase shows that most tutorial-relevant elements already have `data-testid` attributes:

| Tutorial Step | Target Element | data-testid | Status |
|---------------|---------------|-------------|--------|
| 1. Drag data file | Document drop zone | (uses `id` only) | **Gap — needs data-testid** |
| 2. Make a graph | Toolbar graph button | `tool-shelf-button-graph` | Exists |
| 3. Move a table/graph | Tile title bar | `component-title-bar` | Exists |
| 4. Drag attr to axis | Table attribute headers | `codap-attribute-button ${attrName}` | Exists |
| 4. Drag attr to axis | Graph x-axis drop zone | `add-attribute-drop-bottom` | Exists |
| 5. Drag 2nd attr | Graph y-axis drop zone | `add-attribute-drop-left` | Exists |
| — | Toolbar container | `tool-shelf` | Exists |
| — | Case table | `case-table` | Exists |
| — | Graph container | `graph` | Exists |

**Only one gap:** The document-level file drop zone (`id="user-entry-drop-overlay"` in `app.tsx`) needs a `data-testid` attribute added. This is trivial.

`data-testid` attributes are not stripped in production builds.

## Tutorial 1 Plugin Integration

### Current Plugin Architecture

The Getting Started plugin (source: [codap-data-interactives/onboarding](https://github.com/concord-consortium/codap-data-interactives/tree/master/onboarding)) is old-school static JavaScript with no build step. It uses:

- Global variables and `React.createElement` calls (no JSX)
- `task_descriptions.js` — defines 5 tasks, each with a key, label, video URL, operation for completion detection, and feedback React elements
- `onboarding.js` — core plugin logic, handles "Show me" clicks (plays video), listens for completion notifications from CODAP

### Tutorial Tasks

| # | Key | Task | Completion Detection |
|---|-----|------|---------------------|
| 1 | `Drag` | Drag data file into CODAP | `dataContextCountChanged` |
| 2 | `MakeGraph` | Make a graph | Graph creation notification |
| 3 | `MoveComponent` | Move a table or graph | `move` on `DG.GraphView`/`DG.TableView` |
| 4 | `AssignAttribute` | Drag attribute to graph axis | Attribute assignment notification |
| 5 | `SecondAttribute` | Drag 2nd attribute to graph axis | Attribute assignment notification |

### Proposed Changes

**Scope limitation:** Plugin-side changes should be minimal. The goal is demonstrating the API, not rebuilding the plugin.

**Approach:** Add highlight definitions alongside existing video URLs. "Show me" triggers both the video and a highlight. Driver.js's built-in Next/Previous/Close buttons handle tour navigation — no need for the plugin to coordinate tour state.

Each task description gains a `highlight` property:

```javascript
{
  key: 'MakeGraph',
  label: tr("~onboarding1.graph.task"),
  url: './resources/' + resourceDir() + "MakeGraph.mp4",
  highlight: {
    target: { testId: "tool-shelf-button-graph" },
    popover: {
      description: "Click this button to create a graph",
      side: "bottom"
    }
  },
  operation: ...,
  feedback: ...
}
```

**Completion → clear highlight:** The plugin already detects task completion (to show success feedback). At the same point, it calls `clearHighlight` via the API. This is one additional API call in the existing completion handler — no new detection logic needed.

### What This Does NOT Include

- Replacing existing videos (highlights supplement them)
- Complex plugin-side tour state management
- Automated stepping based on completion detection (user advances manually via Driver.js controls)
- Changes to Tutorial 2 or other tutorials

## Implementation Plan

### CODAP-1167: Tour/Highlight API (5-8 story points)

1. **Add Driver.js dependency** to CODAP v3
2. **Create tour manager** — singleton that owns the Driver.js instance, handles highlight/tour/clear requests, manages lifecycle
3. **Implement element resolution** — resolves `{ testId, component? }` to DOM elements, scoping by tile when a component is specified
4. **Add API handlers** in the data-interactive handler system:
   - `highlight` request on `interactiveFrame` and `component` resources
   - `clearHighlight` request on `interactiveFrame`
   - `startTour` request on `interactiveFrame`
   - `endTour` request on `interactiveFrame`
5. **Add `data-testid` to document drop zone** (`app.tsx`)
6. **Testing** — unit tests for element resolution, manual testing of highlight/tour lifecycle

### CODAP-1166: Tutorial 1 Conversion (2-3 story points)

1. **Add highlight definitions** to each task in `task_descriptions.js`
2. **Update "Show me" handler** in `onboarding.js` to call highlight API alongside video playback
3. **Add `clearHighlight` call** in the existing completion handler
4. **Testing** — manual walkthrough of all 5 tutorial steps with highlights

**Total estimate: 7-11 story points across both stories.**

## Design Decisions

1. **Popover text content** — Instructional text should be localizable, using the same POEditor system the onboarding plugin already uses for its existing strings.
2. **Multi-step tours for individual tasks** — Tasks involving multiple UI elements (e.g., "drag attribute to axis" involves the attribute header and the axis drop zone) should use mini-tours (2-3 steps) to demonstrate that capability of the API.
3. **Video + highlight interaction** — Highlights appear immediately when "Show me" is clicked, simultaneously with the video. The user sees both the video demonstration and the highlighted UI element at the same time.

## Open Questions

1. **Future API extensions** — Event callbacks from CODAP to the plugin (tour step completed, tour dismissed) are not included in the initial scope but would be needed for more sophisticated tour coordination later.

## Notes

- Driver.js overlays cover the CODAP host page but not plugin iframes. This is fine for the initial scope since highlights target CODAP UI elements, not plugin content. In the future, it would be possible to support highlighting elements within plugins by having plugins communicate their targetable elements and bounding rectangles to CODAP. CODAP could then place an invisible overlay element over the plugin iframe at the reported coordinates, which Driver.js could target for highlighting. This would require a new API for plugins to register targetable regions, but it's a solvable problem — just not part of this initial effort.
- Driver.js's `refresh()` method can recalculate highlight positions if CODAP layout changes during a tour (e.g., a new tile is created).
- The `element` property in Driver.js accepts a function, enabling lazy resolution of elements that may not exist when the tour is defined.

# Round 1 Review Comments

**Reviewer:** Doug
**Date:** 2026-03-17

## Issues

### 1. `data-testid` as public API — underestimated risk

The spec acknowledges this concern in a note but treats it as something to "review before finalizing." This deserves stronger treatment. Right now `data-testid` values are informal — they're added ad-hoc by developers for Cypress tests, with no naming convention enforcement. Once they become a plugin API contract:
- Renaming any `data-testid` is a breaking change for external plugins
- There's no versioning or deprecation mechanism proposed
- The attribute name `data-testid` itself signals "internal testing" to developers, who may casually rename values during refactors

**Recommendation:** Consider a dedicated `data-tour-id` attribute (or `data-codap-id`) for tour-targeted elements, even if the initial values mirror `data-testid`. This decouples the public API from the testing infrastructure. Alternatively, document a clear policy and add lint rules to prevent casual changes.

### 2. Document drop zone targeting is fragile

The spec identifies the drop zone gap in `app.tsx`, but the bigger problem is that this element is conditionally rendered — it only exists when `isOpenUserEntry` is true. A plugin can't highlight an element that doesn't exist in the DOM. The spec's lazy resolution via Driver.js function resolvers only helps if the element *eventually* appears, but the plugin has no way to trigger `isOpenUserEntry`.

**Recommendation:** The spec should address how to handle elements that are conditionally rendered. Options: (a) return an error when the target isn't found, (b) wait with a timeout, or (c) document that this particular step requires the user to have the entry modal open already.

### 3. No error handling or feedback contract specified

The API examples show the happy path, but the spec doesn't define what happens when:
- A `testId` doesn't match any element
- A `component` reference doesn't resolve to an existing tile
- `startTour` is called while a tour is already active
- The highlighted element is removed from the DOM mid-tour (e.g., user closes a tile)

The existing handlers silently succeed for unrecognized requests (`interactive-frame-handler.ts` line 64: "Unrecognized requests return success to avoid breaking plugins"). This pattern means plugins won't know their highlight/tour requests failed. That's fine for unknown request types but problematic for known requests with bad targets.

**Recommendation:** Define error responses for element-not-found, component-not-found, tour-already-active, etc.

### 4. Tile-to-DOM resolution gap (partial)

The spec says: "resolve it to a tile DOM element using the existing tile registry." The existing tile registry (`findTileFromNameOrId` in `resource-parser-utils.ts`) returns an MST `ITileModel`, not a DOM element, so a DOM mapping still has to be done somewhere.

**Free-tile layout:** there *is* a reliable DOM mapping because the free-tile wrapper uses `id={tile.id}`. A component
can be scoped to its DOM via `document.getElementById(tile.id)` without adding a new attribute.

**Mosaic layout:** there is **no** unique DOM hook (the wrapper is just `className="mosaic-tile-component"`), and the
`CodapComponent` uses `data-testid={tileEltClass}` which is not unique across multiple tiles of the same type.

**Recommendation:** The gap is specific to mosaic layout. Add a stable DOM hook there (e.g., `id={tile.id}` or
`data-tile-id`) so per-tile scoping works in both layouts.

### 5. Component-scoped highlight via `resource` vs `values.component` inconsistency

The API has two ways to specify a component scope:
- Single highlight: `"resource": "component[myGraph]"` (uses resource selector)
- Tour step: `"component": "myGraph"` inside `values.steps[]` (uses values field)

This dual path means the element resolution logic needs to handle both, and the `startTour` handler on `interactiveFrame` needs to do per-step component resolution — but the `interactiveFrame` handler doesn't have access to the component handler's resolution machinery by default. The spec should clarify that `startTour` requires its own component resolution per step.

### 6. HTML in popovers is an XSS vector

The spec says popover `title` and `description` support HTML. Since these values come from plugins (which are third-party iframes), passing raw HTML to Driver.js creates an XSS risk. A malicious plugin could inject scripts into the CODAP host frame, escaping the iframe sandbox.

**Recommendation:** Sanitize HTML content before passing to Driver.js (use a library like DOMPurify), or restrict to plain text only for the initial implementation.

### 7. Missing: how the plugin knows what `testId` values exist

The API requires plugins to know `data-testid` values, but there's no discovery mechanism. Plugins must hardcode these values based on out-of-band knowledge. This is fine for the Getting Started tutorial (which is maintained alongside CODAP), but the spec should acknowledge this limitation for third-party plugins.

### 8. Mosaic layout has no unique tile DOM hook

In free-tile layout, the tile wrapper has `id={tileId}` and can be found via `document.getElementById(tile.id)`. In
**mosaic** layout, the wrapper is just a `<div className="mosaic-tile-component">` with no `id` or `data-*` attribute,
so component-scoped highlights cannot reliably scope to a specific tile when multiple tiles of the same type exist.

**Recommendation:** Add a stable DOM hook for mosaic tiles (e.g., `id={tile.id}` or `data-tile-id`) to make per-tile
scoping possible in both layouts.

### 9. Component lookup by name/title can be ambiguous

`findTileFromNameOrId()` returns the first tile whose name/title matches. If multiple tiles share a title (common in
tutorials where users create multiple graphs), `component[Graph]` can resolve unpredictably, causing highlights to
attach to the wrong tile.

**Recommendation:** Prefer V2 IDs when possible, or return an error when multiple tiles match to avoid unpredictable
highlighting.

### 10. `data-testid` values may require escaping in selectors

The tutorial relies on `data-testid` values that can contain spaces or punctuation (e.g.,
`codap-attribute-button ${attrName}`). If the implementation uses CSS selectors (e.g., `[data-testid="..."]` or
`querySelector()`), it must escape the value (`CSS.escape`) or use attribute-based matching to avoid failures when
attribute names include spaces or special characters.

**Recommendation:** Use `CSS.escape()` or direct attribute comparison rather than raw selector strings.

### 11. Highlight requests may be delayed while editing table cells

Data-interactive requests are blocked while a table cell is being edited (`uiState.isEditingBlockingCell`). This can
make highlights/tours appear delayed or unresponsive during tutorial steps that involve editing/renaming.

**Recommendation:** Document this behavior or exempt highlight/tour requests from the edit-blocking gate.

## Minor Issues

- **`overlayClickBehavior`** is typed as `string` but the description says `"close"`. Should enumerate the valid values.
- **`showButtons`** is `string[]` but should be `("next" | "previous" | "close")[]`.
- The **story point estimates** (5-8 and 2-3) seem reasonable but may be tight given the tile-to-DOM resolution gap.

## What's Good

- Leveraging the existing plugin API notify mechanism is clean — no new communication channels needed
- The `data-testid` coverage analysis is thorough and mostly accurate (verified against the codebase)
- Keeping the plugin-side changes minimal for CODAP-1166 is pragmatic
- The library choice (Driver.js) is appropriate for the use case
- The decision to run Driver.js in the host frame is correct given iframe limitations

## Summary of blockers/concerns in priority order

1. **Tile-to-DOM resolution (mosaic layout)** — no unique DOM identifier per tile instance in mosaic layout (needs `id={tile.id}` or `data-tile-id` there)
2. **XSS risk** — HTML content from plugins needs sanitization
3. **Error handling contract** — undefined behavior for missing elements/components
4. **Conditional rendering** — drop zone element may not exist when targeted
5. **`data-testid` as public API** — needs governance strategy before shipping
