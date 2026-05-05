# Plugin Tour API

This document describes how CODAP plugins can use the Tour API to highlight UI elements and run guided tours. The Tour API is available to any data-interactive plugin communicating with CODAP via iframe-phone.

## Overview

The Tour API enables plugins to:

- **Highlight** a single CODAP UI element with an optional popover
- **Run multi-step tours** that walk users through a sequence of highlighted elements
- **Navigate tours programmatically** (next, previous, jump to step)
- **Receive notifications** when tour steps start, end, complete, or are cancelled
- **Discover available UI elements** via the tour elements registry

Only one tour or highlight can be active at a time. Starting a new one replaces the current one.

## Element Targeting

Tour steps target CODAP UI elements using one of three methods (in priority order):

| Method | Description | Example |
|--------|-------------|---------|
| `tourKey` | Stable key from the tour elements registry. Includes default title and description. | `"toolShelf.graph"` |
| `testId` | A `data-testid` attribute value | `"tool-shelf-button-graph"` |
| `selector` | Raw CSS selector | `".menu-bar-left .file-menu-button"` |
| `component` alone | Target the tile itself (no sub-element) | `"123"` or `"Mammals"` |

If multiple are provided, the first one found (in the priority order above) is used. If none of `tourKey`, `testId`, or `selector` is provided but `component` is, the tile's root element is targeted directly — this is the simplest way to highlight an entire tile. If the targeted element is not found in the DOM, the step is silently skipped.

### Component Scoping

All three targeting methods support an optional `component` parameter that scopes the DOM lookup to a specific tile. When provided, the CSS selector is resolved within that tile's DOM subtree instead of the entire document. This is essential when targeting elements that exist in multiple tiles — for example, if the workspace has three graphs and you want to highlight the x-axis drop zone on a specific one, or if there are two tables and you want to point at a column header in one of them.

The `component` value can be:

- A **component name** (the tile's user-visible title, e.g., `"Mammals"`)
- A **component ID** (the numeric V2 ID returned by the plugin API in component notifications and `get` responses)

```json
{
  "testId": "add-attribute-drop-bottom",
  "component": "myGraph"
}
```

To highlight an entire tile, pass `component` alone with no targeting property:

```json
{
  "component": "123"
}
```

## API Reference

All tour requests use the `interactiveFrame` notify pattern:

```json
{ "action": "notify", "resource": "interactiveFrame", "values": { "request": "...", ... } }
```

### highlight

Highlight a single element with an optional popover.

```json
{
  "request": "highlight",
  "tourKey": "toolShelf.graph",
  "id": "my-highlight-id",
  "popover": {
    "title": "Custom Title",
    "description": "Custom description",
    "side": "bottom",
    "align": "center"
  }
}
```

All fields except `request` and at least one targeting property (`tourKey`, `testId`, `selector`, or `component`) are optional. When using `tourKey`, the registry provides default `title` and `description` which can be overridden via `popover`.

Additional options: `component`.

### clearHighlight

Dismiss the active highlight. Idempotent — safe to call when nothing is active.

```json
{ "request": "clearHighlight" }
```

### startTour

Start a multi-step guided tour. Returns a `tourId` for tracking.

```json
{
  "request": "startTour",
  "steps": [
    { "tourKey": "toolShelf.graph", "id": "step-create-graph" },
    { "testId": "add-attribute-drop-bottom", "component": "myGraph",
      "popover": { "description": "Drag an attribute here" }, "id": "step-drag-attr" }
  ]
}
```

**Response:**
```json
{ "success": true, "values": { "tourId": "tour-01JQ..." } }
```

#### Tour-Level Options

| Option | Type | Description |
|--------|------|-------------|
| `showButtons` | string[] | Which buttons to show: `"next"`, `"previous"`, `"close"` |
| `disableButtons` | string[] | Buttons to disable (visible but not clickable) |
| `showProgress` | boolean | Show step progress indicator |
| `allowKeyboardControl` | boolean | Allow arrow key navigation |
| `allowClose` | boolean | Allow dismissing via Escape or close button |
| `animate` | boolean | Animate step transitions (default: true) |
| `smoothScroll` | boolean | Smooth scroll to elements (default: false) |
| `popoverOffset` | number | Distance between popover and element (px) |
| `progressText` | string | Progress format, e.g., `"{{current}} of {{total}}"` |
| `nextBtnText` | string | Next button label (for i18n) |
| `prevBtnText` | string | Previous button label (for i18n) |
| `doneBtnText` | string | Done button label (for i18n) |

### endTour

End the active tour. Accepts an optional `tourId` for safety — if provided, only ends the tour matching that ID.

```json
{ "request": "endTour", "tourId": "tour-01JQ..." }
```

### tourNext / tourPrevious

Advance to the next or previous step. Triggers normal `stepEnded`/`stepStarted` notifications. If on the last step, `tourNext` completes the tour.

```json
{ "request": "tourNext" }
{ "request": "tourPrevious" }
```

### tourMoveTo

Jump to a specific step by its original (pre-filter) array index.

```json
{ "request": "tourMoveTo", "stepIndex": 3 }
```

### tourRefresh

Recalculate popover position for the current step. Useful after layout changes (e.g., tile resize).

```json
{ "request": "tourRefresh" }
```

### get tourElements

Query the tour elements registry to discover available `tourKey` values.

```json
{ "action": "get", "resource": "tourElements" }
```

**Response:**
```json
{
  "success": true,
  "values": {
    "menuBar.container": {
      "selector": "[data-testid=\"codap-menu-bar\"]",
      "title": "Menu Bar",
      "description": "This is the menu bar..."
    },
    "toolShelf.graph": {
      "selector": "[data-testid=\"tool-shelf-button-graph\"]",
      "title": "Graph",
      "description": "Click Graph to create a new graph..."
    }
  }
}
```

## Notifications

Notifications are delivered to the plugin's iframe-phone channel automatically — no registration step is needed.

### Highlight Notifications

```json
{ "action": "notify", "resource": "interactiveFrame",
  "values": {
    "operation": "highlightUpdate",
    "type": "highlighted",
    "id": "my-highlight-id",
    "tourKey": "toolShelf.graph"
  }
}
```

| Type | When |
|------|------|
| `highlighted` | Highlight is shown |
| `highlightCleared` | User dismisses (Escape, close button) or replaced by another tour/highlight |

Programmatic `clearHighlight` does **not** generate a notification (the plugin already knows).

### Tour Notifications

```json
{ "action": "notify", "resource": "interactiveFrame",
  "values": {
    "operation": "tourUpdate",
    "tourId": "tour-01JQ...",
    "type": "stepStarted",
    "stepIndex": 0,
    "totalSteps": 5,
    "visibleSteps": 4,
    "id": "step-create-graph",
    "tourKey": "toolShelf.graph"
  }
}
```

| Type | When | Notes |
|------|------|-------|
| `stepStarted` | Step begins transitioning | Includes `stepIndex`, `totalSteps`, `visibleSteps`, `id`, targeting property |
| `stepEnded` | User moves past a step | Same fields as `stepStarted` |
| `completed` | Tour reaches the end | Includes `tourId`, `totalSteps`, `visibleSteps` |
| `cancelled` | User dismisses or tour is replaced | Includes `stepIndex` and step fields. **`stepEnded` is NOT sent** for the interrupted step. |

`stepIndex` and `totalSteps` always refer to the **original** step array (pre-filtering). `visibleSteps` is the filtered count — the number of steps the user actually sees.

## Usage Examples

### Example 1: Simple UI Orientation

Highlight toolbar buttons one at a time to introduce the CODAP interface. Each highlight is independent — no multi-step tour needed. Listen for the `highlightCleared` notification to know when the user dismissed the current highlight before showing the next one.

```javascript
const elementsToHighlight = ["toolShelf.graph", "toolShelf.table", "toolShelf.map"]
let currentIndex = 0

// Listen for highlight dismissals to advance to the next element
codapInterface.on("notify", "interactiveFrame", notice => {
  if (notice.values.operation === "highlightUpdate" &&
      notice.values.type === "highlightCleared") {
    currentIndex++
    if (currentIndex < elementsToHighlight.length) {
      highlightElement(elementsToHighlight[currentIndex])
    }
  }
  return { success: true }
})

function highlightElement(tourKey) {
  codapInterface.sendRequest({
    action: "notify", resource: "interactiveFrame",
    values: { request: "highlight", tourKey }
  })
}

// Start with the first element
highlightElement(elementsToHighlight[0])
```

### Example 2: Guided Tour with Custom Text

Run a multi-step tour that walks students through the toolbar with custom descriptions.

```javascript
const result = await codapInterface.sendRequest({
  action: "notify", resource: "interactiveFrame",
  values: {
    request: "startTour",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Let's go!",
    progressText: "Step {{current}} of {{total}}",
    steps: [
      {
        tourKey: "toolShelf.table",
        id: "intro-table",
        popover: {
          title: "Step 1: Tables",
          description: "This button creates a new table to hold your data."
        }
      },
      {
        tourKey: "toolShelf.graph",
        id: "intro-graph",
        popover: {
          title: "Step 2: Graphs",
          description: "After you have data, use this button to create a graph."
        }
      },
      {
        tourKey: "menuBar.helpMenu",
        id: "intro-help",
        popover: {
          title: "Need Help?",
          description: "You can always find help resources here."
        }
      }
    ]
  }
})

const tourId = result.values.tourId
```

### Example 3: Reactive Workflow — Highlight a Newly Created Component

This is the most powerful pattern for tutorial plugins. The plugin asks the user to perform an action, listens for CODAP notifications to detect when it's done, then highlights the result.

**Scenario:** Ask the student to create a table, then highlight the new table when it appears.

```javascript
// Step 1: Show instructions in the plugin UI
showInstruction("Click the Tables button in the toolbar to create a new table.")

// Step 2: Optionally highlight the Tables button so the student knows where to click
await codapInterface.sendRequest({
  action: "notify", resource: "interactiveFrame",
  values: {
    request: "highlight",
    tourKey: "toolShelf.table",
    popover: {
      title: "Click here",
      description: "Click this button to create a new case table."
    }
  }
})

// Step 3: Listen for the component creation notification from CODAP.
// When the user creates a table, CODAP sends:
//   { action: "notify", resource: "component",
//     values: { operation: "create", id: 123, type: "caseTable" } }
codapInterface.on("notify", "*", notice => {
  if (notice.resource === "component" &&
      notice.values.operation === "create" &&
      notice.values.type === "caseTable") {

    const newTableId = notice.values.id

    // Step 4: Clear the toolbar highlight
    codapInterface.sendRequest({
      action: "notify", resource: "interactiveFrame",
      values: { request: "clearHighlight" }
    })

    // Step 5: Highlight the newly created table using its component ID.
    // Passing only "component" with no tourKey/testId/selector highlights
    // the entire tile.
    codapInterface.sendRequest({
      action: "notify", resource: "interactiveFrame",
      values: {
        request: "highlight",
        component: String(newTableId),
        popover: {
          title: "Your New Table",
          description: "Great! This is your case table. You can type data directly into it.",
          side: "right"
        }
      }
    })
  }
  return { success: true }
})
```

The key insight is that the `component` parameter accepts the numeric component ID that CODAP includes in its `component` create notification. This lets you target a specific tile instance even when multiple tiles of the same type exist.

### Example 4: Auto-Advancing Tutorial

Build a step-by-step tutorial where the plugin detects task completion and programmatically advances the tour. The plugin uses single highlights (not a multi-step tour) so students can interact with CODAP between steps.

```javascript
const tutorialSteps = [
  {
    instruction: "Create a graph by clicking the Graph button.",
    highlight: { tourKey: "toolShelf.graph" },
    waitFor: notice =>
      notice.resource === "component" &&
      notice.values.operation === "create" &&
      notice.values.type === "graph"
  },
  {
    instruction: "Now drag the 'Height' attribute to the x-axis of your graph.",
    // Use component scoping to highlight the correct graph's drop zone
    highlight: (state) => ({
      testId: "add-attribute-drop-bottom",
      component: String(state.graphId),
      popover: { description: "Drag 'Height' here" }
    }),
    waitFor: (notice, state) => {
      // Listen for attribute placement on the graph
      // (specific notification depends on your data context setup)
      return notice.resource === `dataContext[${state.dataContextName}]` &&
             notice.values.operation === "selectCases"
    }
  }
]

let state = {}
let currentStepIndex = 0

// Register one listener that dispatches to the current step's waitFor
codapInterface.on("notify", "*", notice => {
  if (currentStepIndex < tutorialSteps.length) {
    const step = tutorialSteps[currentStepIndex]
    if (step.waitFor(notice, state)) {
      // Capture any state from the notification
      if (notice.values.type === "graph") {
        state.graphId = notice.values.id
      }

      // Clear and advance
      codapInterface.sendRequest({
        action: "notify", resource: "interactiveFrame",
        values: { request: "clearHighlight" }
      })
      runStep(currentStepIndex + 1)
    }
  }
  return { success: true }
})

async function runStep(stepIndex) {
  currentStepIndex = stepIndex
  if (stepIndex >= tutorialSteps.length) {
    showInstruction("Tutorial complete!")
    return
  }

  const step = tutorialSteps[stepIndex]
  showInstruction(step.instruction)

  // Resolve highlight config (may depend on state)
  const highlightConfig = typeof step.highlight === "function"
    ? step.highlight(state)
    : step.highlight

  await codapInterface.sendRequest({
    action: "notify", resource: "interactiveFrame",
    values: { request: "highlight", ...highlightConfig }
  })
}

runStep(0)
```

### Example 5: Localized Tour

Provide tour text in the student's language using the label customization options.

```javascript
const labels = {
  en: { next: "Next", prev: "Back", done: "Got it!", progress: "{{current}} of {{total}}" },
  es: { next: "Siguiente", prev: "Atrás", done: "Entendido", progress: "{{current}} de {{total}}" }
}

const lang = getCurrentLanguage() // "en", "es", etc.
const l = labels[lang] || labels.en

await codapInterface.sendRequest({
  action: "notify", resource: "interactiveFrame",
  values: {
    request: "startTour",
    nextBtnText: l.next,
    prevBtnText: l.prev,
    doneBtnText: l.done,
    progressText: l.progress,
    steps: [
      {
        tourKey: "toolShelf.table",
        popover: {
          title: lang === "es" ? "Tablas" : "Tables",
          description: lang === "es"
            ? "Haz clic aquí para crear una tabla de datos."
            : "Click here to create a data table."
        }
      }
    ]
  }
})
```

## Available Tour Element Keys

The following `tourKey` values are available in the registry. Use `get tourElements` to retrieve the full list at runtime.

### menuBar

| Key | Description |
|-----|-------------|
| `menuBar.container` | The entire menu bar |
| `menuBar.fileMenu` | File menu button |
| `menuBar.documentName` | Document name display |
| `menuBar.logo` | CODAP logo |
| `menuBar.helpMenu` | Help menu |
| `menuBar.settingsMenu` | Settings menu |
| `menuBar.languageMenu` | Language selector |

### toolShelf

| Key | Description |
|-----|-------------|
| `toolShelf.container` | The entire toolbar |
| `toolShelf.table` | Tables button |
| `toolShelf.graph` | Graph button |
| `toolShelf.map` | Map button |
| `toolShelf.slider` | Slider button |
| `toolShelf.calculator` | Calculator button |
| `toolShelf.text` | Text button |
| `toolShelf.webPage` | Web Page button |
| `toolShelf.plugins` | Plugins button |
| `toolShelf.undo` | Undo button |
| `toolShelf.redo` | Redo button |
| `toolShelf.tilesList` | Tiles list button |

### workspace

| Key | Description |
|-----|-------------|
| `workspace.container` | The main document workspace |

## Design Notes

### Tutorial Plugins and Click-Through

The tour system no longer imposes an overlay over the workspace. Click-through and subelement interaction (menus, dialogs, the highlighted element itself) are the default behavior. Tutorial plugins that need students to interact with CODAP between steps can use either single highlights cleared between steps, or a multi-step tour — students can interact with any part of the UI while the popover is visible.

### Cleanup

When a plugin's iframe is destroyed or disconnects, any active tour or highlight owned by that plugin is automatically cleaned up. Plugins do not need to explicitly end tours on unload.

### Replacement Behavior

If Plugin A has an active tour and Plugin B starts a new tour or highlight, Plugin A receives a `cancelled` notification before its tour is destroyed. The new tour then starts normally.
