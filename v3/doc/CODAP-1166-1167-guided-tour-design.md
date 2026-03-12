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
Plugins already identify tiles by type, name, or ID (e.g., `component[myGraph]`).

**Level 2 — Sub-element targeting within a tile** (new):
Uses existing `data-testid` attribute values as sub-element identifiers. This avoids creating a parallel attribute system and ensures test coverage and tour coverage grow together.

When a component is specified, the `data-testid` lookup is scoped to that component's DOM subtree, disambiguating cases where multiple tiles have the same sub-element (e.g., axis drop zones in two different graphs).

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
        "component": { "type": "graph" },
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

1. If a `component` is specified, resolve it to a tile DOM element using the existing tile registry
2. Within that scope (or document-wide for `interactiveFrame`), find the element with the matching `data-testid`
3. Pass the resolved DOM element to Driver.js using a function resolver (lazy evaluation handles elements that may not exist yet)

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
    popover: { description: "Click this button to create a graph" },
    side: "bottom"
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
