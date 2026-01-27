# Embedding CODAP

This document describes how to embed CODAP in another application using URL parameters to control the UI and enable communication between CODAP and the parent application.

## Overview

CODAP supports two modes for embedding:

| Mode | URL Parameter | Purpose |
|------|---------------|---------|
| **Component Mode** | `componentMode=yes` | Minimal UI chrome for simple embedding |
| **Embedded Mode** | `embeddedMode=yes` | Full embedding with parent communication via iframe-phone |

Both modes hide UI chrome and disable certain interactions. **Embedded mode is a superset of component mode**, adding iframe-phone communication and additional styling.

## URL Parameters

### `componentMode`

| Property | Value |
|----------|-------|
| Type | Boolean string |
| Values | `yes`, `true`, `1` (enabled) or `no`, `false`, `0` (disabled) |
| Default | Disabled |

Enables minimal chrome mode for simple embedding scenarios where parent-child communication is not needed.

```
https://codap.concord.org/releases/latest/?componentMode=yes
```

### `embeddedMode`

| Property | Value |
|----------|-------|
| Type | Boolean string |
| Values | `yes`, `true`, `1` (enabled) or `no`, `false`, `0` (disabled) |
| Default | Disabled |

Enables full embedded mode for running CODAP inside another application (e.g., SageModeler). Includes all component mode behaviors plus iframe-phone communication with the parent window and transparent background styling.

```
https://codap.concord.org/releases/latest/?embeddedMode=yes
```

### `embeddedServer`

| Property | Value |
|----------|-------|
| Type | Boolean string |
| Values | `yes`, `true`, `1` (enabled) or `no`, `false`, `0` (disabled) |
| Default | Disabled |

Enables iframe-phone communication with the parent window **without** hiding UI chrome. Useful when you want the parent page to send commands to CODAP but still show the full CODAP interface.

**Note:** When `embeddedMode=yes`, the `embeddedServer` parameter is ignored because embedded mode automatically enables the server.

```
https://codap.concord.org/releases/latest/?embeddedServer=yes
```

### Related Parameters

| Parameter | Purpose |
|-----------|---------|
| `hideUndoRedoInComponent=yes` | Hide undo/redo buttons from component title bars |
| `hideSplashScreen=yes` | Suppress the startup splash screen |
| `suppressUnsavedWarning=yes` | Suppress the browser's unsaved changes warning |
| `di=<url>` | Load a data interactive (plugin) on startup |

## Behavior Changes

### Shared Behaviors (Component Mode and Embedded Mode)

When either `componentMode=yes` or `embeddedMode=yes`:

| Behavior | Description |
|----------|-------------|
| Menu bar hidden | The Cloud File Manager menu bar is not displayed |
| Tool shelf hidden | The toolbar with component creation buttons is hidden |
| Beta banner hidden | The beta version banner is not displayed |
| Scrollbars disabled | Horizontal and vertical scrollbars are hidden |
| Component interactions disabled | Move, resize, close, and minimize are disabled |
| Undo/redo in title bar | Undo/redo buttons appear in component title bars (unless `hideUndoRedoInComponent=yes`) |
| Page title unchanged | CODAP does not update `document.title` |
| Unsaved warning suppressed | Browser's `beforeunload` dialog is not shown |
| Splash screen bypassed | The startup splash screen is not shown |
| User entry modal bypassed | The initial "What would you like to do?" modal is not shown |
| Auto-focus enabled | The initial tile receives focus automatically |

### Additional Behaviors (Embedded Mode Only)

When `embeddedMode=yes`:

| Behavior | Description |
|----------|-------------|
| Transparent background | The background is transparent, allowing parent page content to show through |
| Text selectable | Text selection is enabled in the background area |
| iframe-phone enabled | Communication with parent window via iframe-phone is initialized |
| `codap-present` message | CODAP sends a `codap-present` message to the parent when ready |
| Notification broadcasts | CODAP broadcasts data change notifications to the parent |

## iframe-phone Communication

When running in embedded mode (or with `embeddedServer=yes`), CODAP establishes an iframe-phone RPC endpoint for communication with the parent window.

### Setup

The parent page should set up an iframe-phone endpoint:

```html
<iframe id="codap" src="https://codap.concord.org/releases/latest/?embeddedMode=yes"></iframe>
<script src="https://unpkg.com/iframe-phone@1.3.1/dist/iframe-phone.js"></script>
<script>
  const codapFrame = document.getElementById('codap');
  const phone = new iframePhone.IframePhoneRpcEndpoint(
    function(command, callback) {
      // Handle notifications from CODAP
      console.log('Received from CODAP:', command);
      callback({ success: true });
    },
    'data-interactive',
    codapFrame.contentWindow,
    codapFrame.src
  );

  // Wait for CODAP to be ready
  phone.call({ message: 'codap-present' }, function(reply) {
    console.log('CODAP is ready');
  });
</script>
```

### Sending Commands

The parent can send Data Interactive API commands to CODAP:

```javascript
// Get list of data contexts
phone.call({
  action: 'get',
  resource: 'dataContextList'
}, function(result) {
  console.log('Data contexts:', result.values);
});

// Create a new data context
phone.call({
  action: 'create',
  resource: 'dataContext',
  values: {
    name: 'MyData',
    collections: [{
      name: 'Cases',
      attrs: [
        { name: 'x', type: 'numeric' },
        { name: 'y', type: 'numeric' }
      ]
    }]
  }
}, function(result) {
  console.log('Created:', result);
});

// Create cases
phone.call({
  action: 'create',
  resource: 'dataContext[MyData].collection[Cases].case',
  values: [
    { values: { x: 1, y: 2 } },
    { values: { x: 3, y: 4 } }
  ]
}, function(result) {
  console.log('Created cases:', result);
});
```

### Receiving Notifications

When `isPhoneInUse` is true (after the parent has sent at least one command), CODAP broadcasts notifications for data changes:

- Data context changes
- Case changes (create, update, delete)
- Attribute changes
- Selection changes
- Component changes

## Example URLs

### Simple embedding with minimal chrome
```
https://codap.concord.org/releases/latest/?componentMode=yes
```

### Full embedded mode with a plugin
```
https://codap.concord.org/releases/latest/?embeddedMode=yes&di=https://example.com/plugin.html
```

### Embedded mode with hidden undo/redo
```
https://codap.concord.org/releases/latest/?embeddedMode=yes&hideUndoRedoInComponent=yes
```

### Server mode only (full UI with parent communication)
```
https://codap.concord.org/releases/latest/?embeddedServer=yes
```

## Implementation Details

For developers working on the CODAP codebase, the embedding functionality is implemented in:

| File | Purpose |
|------|---------|
| `src/models/ui-state.ts` | `UIState` class with `minimalChrome`, `embeddedMode`, and related getters |
| `src/lib/embedded-mode/embedded-server.ts` | iframe-phone communication with parent window |
| `src/lib/embedded-mode/embedded-mode-registry.ts` | Registry for embedded mode handlers |
| `src/lib/embedded-mode/use-embedded-mode.ts` | React hook for embedded mode initialization |
| `src/components/app.scss` | CSS styles for embedded mode (transparent background, etc.) |
| `src/components/container/free-tile-row.scss` | Scrollbar hiding via `.minimal-chrome` class |

### Key Concepts

**minimalChrome**: A computed property in `UIState` that returns `true` when either `componentMode` or `embeddedMode` is active. Used to control shared behaviors like UI chrome visibility and scrollbar hiding.

**EmbeddedModeHandler**: Interface for the iframe-phone handler that manages communication with the parent window. Includes methods for broadcasting messages and tracking whether the phone is in use.

### Test Harness

A test harness is available at `/embedded-mode-harness.html` in development builds for testing embedded mode communication.

#### Accessing the Test Harness

1. Start the development server:
   ```bash
   cd v3
   npm start
   ```

2. Open the test harness in your browser:
   ```
   http://localhost:8080/embedded-mode-harness.html
   ```

#### Layout

The test harness has two main panels:

- **Left panel**: Control panel with connection status, command input, and response log
- **Right panel**: CODAP running in an iframe with `embeddedMode=yes`

#### Connection Status

The status section shows two indicators:

| Indicator | Description |
|-----------|-------------|
| **codap-present** | Turns green when CODAP sends the `codap-present` message indicating it's ready |
| **Phone in use** | Turns green after you send a command, indicating the communication channel is active |

Wait for the "codap-present" indicator to turn green before sending commands.

#### Sending Commands

**Using preset commands:**

Click one of the preset buttons to load a common command:
- **dataContextList** - Get list of all data contexts
- **componentList** - Get list of all components (tiles)
- **create dataContext** - Create a new data context with sample attributes

**Using custom commands:**

1. Edit the JSON in the command input textarea
2. Click "Send Command"
3. View the response in the Response section

Example custom command to create cases:
```json
{
  "action": "create",
  "resource": "dataContext[TestData].collection[Cases].case",
  "values": [
    { "values": { "x": 1, "y": 2 } },
    { "values": { "x": 3, "y": 4 } }
  ]
}
```

#### Response Log

The response section shows timestamped entries for:
- **SENT**: Commands you send to CODAP
- **RECEIVED**: Responses from CODAP
- **NOTIFICATION**: Broadcasts from CODAP (data changes, selection changes, etc.)

Click "Clear" to reset the response log.

#### Forwarding URL Parameters

URL parameters added to the harness URL are forwarded to CODAP. For example:

```
http://localhost:8080/embedded-mode-harness.html?sample=mammals
```

This loads CODAP with the mammals sample data set, allowing you to test commands against real data.

#### Testing Workflow

1. Open the test harness and wait for "codap-present" to turn green
2. Click "dataContextList" to verify communication is working
3. Click "create dataContext" to create a test data context
4. Send custom commands to create cases, attributes, or components
5. Observe notifications in the response log when you interact with CODAP in the iframe
