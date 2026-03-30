# CODAP V3 Logging Architecture

This document describes the V3 logging infrastructure, how it compares to V2, and
the key design decisions behind the implementation.

## Architecture Overview

V3 logging has three layers: the core Logger, CFM integration for LARA/Activity
Player forwarding, and the Data Interactive log monitor API for plugins.

```
                              CODAP V3 Logging Architecture
                              ─────────────────────────────

  User actions / applyModelChange()          Data Interactive plugins
           │                                        │
           │ { log: "event msg" }            notify logMessage
           ▼                                  { formatStr, replaceArgs, topic? }
     AppHistoryService                              │
           │                                        ▼
           │ tileEnv.log()               log-message-handler.ts
           ▼                               │                │
      Logger.log(event, args, category)    │          LogMonitorManager
           │                               │          .evaluateLogEvent()
           ▼                               │                │
      formatAndSend()                      ▼                ▼
           │                         Logger.log()    logMessageNotice
           ├─→ sendToLoggingService()                → matching plugins
           │     POST logger.concordqa.org/logs
           │
           ├─→ sendToAnalyticsService()
           │     window.gtag("event", ...)
           │
           └─→ logListeners.forEach(listener)
                    │                    │
                    ▼                    ▼
            cfmClient.log()      [CODAP-1213 log monitor sidebar]
                    │
                    ▼
            CFM _event('log')
                    │
                    ▼
            InteractiveApiProvider listener [CFM PR #419]
                    │
                    ▼
            lara-interactive-api log(action, data)
                    │
                    ▼
            postMessage to LARA/Activity Player host


  CFM provider logLaraData callback
           │
    logLaraData(obj)
           │
           └─→ handleLogLaraData()
                 → Logger.setRunRemoteEndpoint()
                 → Logger.log("laraData", obj)


  CFM appOptions.log  [NO-OP — loop prevention]
  CFM "log" event     [commented out — not needed]
```

### Layer 1: Core Logger

**File:** `src/lib/logger.ts`

The `Logger` singleton is the central logging service. All CODAP-originated log
events flow through `Logger.log()`, typically via the `applyModelChange()` pattern
that ties logging to the undo/redo history:

```typescript
applyModelChange(() => { /* model mutation */ }, {
  log: "some event message",
  undoStringKey: "UNDO.ACTION",
  redoStringKey: "REDO.ACTION"
})
```

The history service extracts the `log` option and routes it to `Logger.log()`.

`Logger.formatAndSend()` delivers each log message to three destinations:

1. **Log server** — POST to `logger.concordqa.org/logs` (domain-gated to
   `*.concord.org` hosts, with a `DEBUG_LOGGER` localStorage override)
2. **Google Analytics** — `window.gtag("event", ...)` with filename and URL
3. **Log listeners** — registered callbacks for extensibility

Key features:

- **Listener dispatch with pending queue**: `Logger.registerLogListener()` works
  before or after initialization. Listeners registered before `initializeLogger()`
  are queued and flushed when the Logger instance is created.
- **`run_remote_endpoint` support**: Set via `Logger.setRunRemoteEndpoint()` and
  included in every subsequent log message sent to the server. This links log
  entries to individual users in the LARA/Activity Player ecosystem.
- **`runKey` session support**: If a `runKey` URL parameter is present, it is used
  as the session ID instead of a random `nanoid()`. This matches V2 behavior for
  anonymous session tracking.
- **`resetForTesting()`**: Static method that clears the singleton, pending
  messages, and pending listeners for test isolation.

### Layer 2: CFM Integration (LARA/Activity Player Forwarding)

**Files:** `src/lib/cfm/use-cloud-file-manager.ts`, `src/lib/cfm/cfm-log-utils.ts`

LARA forwarding is a **new capability not present in V2**. V2 sent logs directly to
the log server; V3 additionally routes them to the LARA/Activity Player host via
CFM's connection to lara-interactive-api.

The forwarding works by registering a Logger listener that pipes every log message
through `cfmClient.log()`. CFM PR #419 adds a listener in
`InteractiveApiProvider` that picks up these events and forwards them to
lara-interactive-api's `log()` function, which posts them to the parent frame.

**`handleLogLaraData()`** is a helper called from the LARA provider's
`logLaraData` callback. It extracts `run_remote_endpoint` from the LARA data
payload and stores it on the Logger for inclusion in subsequent log messages.

#### Loop Prevention

`appOptions.log` is intentionally kept as a no-op. If it were active, it would
route CFM events back into `Logger.log()`, which would dispatch to
`cfmClient.log()` via the listener, creating an infinite loop:

```
Logger.log() → listener → cfmClient.log() → appOptions.log → Logger.log() → ∞
```

Each channel has a single responsibility:

| Channel | Purpose |
|---------|---------|
| `cfmClient.log()` (via listener) | Forward all logs to LARA/AP (via PR #419) |
| `logLaraData` provider callback | Extract `run_remote_endpoint` from LARA data |
| `Logger` → log server + GA | Direct logging to Concord servers (unchanged) |
| `appOptions.log` | No-op (loop prevention) |
| CFM `"log"` event listener | Commented out (not needed) |

#### Why the CFM `"log"` Event Listener is Not Needed

V2 had a redundant second path for receiving `logLaraData` events via the CFM
`"log"` event listener. This redundancy was accidental and caused duplicate log
entries. More importantly, `InteractiveApiProvider` (the provider used for
lara-interactive-api communication) only calls `options.logLaraData()` — it does
NOT call `client.log('logLaraData', ...)`. So the `"log"` event listener would
never fire for `logLaraData` events from this provider anyway.

### Layer 3: Data Interactive Log Monitoring

**Files:** `src/data-interactive/log-monitor-manager.ts`,
`src/data-interactive/handlers/log-message-monitor-handler.ts`,
`src/data-interactive/handlers/log-message-handler.ts`

Plugins can register to receive notifications when specific log events occur.
This is the V3 implementation of V2's `logMessageMonitor` API.

#### Registration

Plugins register monitors via the `logMessageMonitor` resource with filter
criteria. All filters on a single monitor are AND'd (all must match):

| Filter | Matching |
|--------|----------|
| `topic` | Exact match on event topic |
| `topicPrefix` | Event topic starts with prefix |
| `formatStr` | Exact match on format string |
| `formatPrefix` | Format string starts with prefix |
| `message` | Exact match on formatted message, or `"*"` for all |

Returns `{ success: true, values: { logMonitor: { id, clientId } } }`.

#### Two Notification Paths

Log events reach the monitor system through two paths:

1. **CODAP-originated events** — A Logger listener registered by
   `LogMonitorManager` at module load time receives every `LogMessage`, constructs
   a `LogEventInfo`, and dispatches to matching monitors. These events have no
   topic.

2. **DI-originated events** — The `logMessage` handler calls
   `logMonitorManager.notifyMatchingMonitors()` directly after logging, passing
   the topic in the `LogEventInfo`. This is necessary because topic is a DI
   monitor filtering concept — it never enters `LogMessage` or the server payload.

The `logMessageNotice` payload delivered to matching plugins:

```typescript
{
  action: "notify",
  resource: "logMessageNotice",
  values: {
    message: string,      // formatted message
    formatStr: string,    // original format string
    topic?: string,       // only for DI-originated events
    replaceArgs?: LoggableValue[],
    logMonitor: { id, clientId }
  }
}
```

## V2 Comparison

### What V3 Preserves from V2

| Feature | V2 | V3 |
|---------|----|----|
| Central logging function | `DG.logUser(fmt, ...args)` | `Logger.log()` via `applyModelChange()` |
| Log server POST | `logger.concord.org/logs` | `logger.concordqa.org/logs` (see below) |
| Domain gating | `hostname.endsWith('concord.org')` | Same check + `DEBUG_LOGGER` override |
| `run_remote_endpoint` | `DG.set('run_remote_endpoint', ...)` | `Logger.setRunRemoteEndpoint()` |
| `runKey` session | URL param → session key | URL param → session ID |
| Plugin → CODAP logging | `logMessage` with `formatStr`, `replaceArgs` | Same API, same handler |
| Log monitor registration | `logMessageMonitor` with 5 filter types | Same filters, same matching logic |
| Log monitor notifications | `logMessageNotice` to matching plugins | Same payload structure |
| Topic-based filtering | `DG.logUserWithTopic()` | Topic on `logMessage` handler, monitor filtering |
| Undo/redo integrated logging | Command `log` property | `applyModelChange({ log })` |
| CFM `logLaraData` handling | Provider callback + event listener | Provider callback only (see above) |
| Pending message queue | Messages before init queued | Same pattern |

### What V3 Does Differently

| Aspect | V2 | V3 |
|--------|----|----|
| Application ID | `"CODAP"` | `"CODAPV3"` (temporary, see below) |
| Session format | `YYMMDDHHMMSS-random` or `runKey` | `nanoid()` or `runKey` |
| Log message format | Printf-style `%@` substitution | `ILogMessage { message, args, category }` |
| Analytics | `ga('send', 'event', ...)` | `gtag('event', ...)` (limited to filename/URL) |
| Framework | SproutCore observer system | MobX-State-Tree + React |
| LARA forwarding | Not present | Logger listener → `cfmClient.log()` → PR #419 → lara-interactive-api |
| `appOptions.log` | Routes CFM events to `DG.logUser()` | No-op (loop prevention) |

### New in V3

**LARA/Activity Player log forwarding** is a new capability. V2 never forwarded
its logs to LARA — they went directly to the log server. V3 routes all log events
to the LARA/Activity Player host via CFM's connection to lara-interactive-api,
using a Logger listener that calls `cfmClient.log()`.

## Dependencies

- **CFM PR #419** (concord-consortium/cloud-file-manager#419): Adds the
  `InteractiveApiProvider` listener that forwards CFM `client.log()` events to
  lara-interactive-api's `log()` function. LARA forwarding depends on this PR.

- **CODAP-1213 branch**: Adds `registerLogListener` dispatch and `isInitialized`
  to Logger independently. The implementations are compatible — if CODAP-1213
  merges first, this branch can rebase and drop its duplicate Logger changes.

## Outstanding Work

- **Production log server and application ID**: During development, V3 logs to
  `logger.concordqa.org` with application ID `"CODAPV3"` to keep development
  traffic separate from production data. When V3 is officially released, both
  should revert to the production values: `logger.concord.org` and `"CODAP"`.

- **V2 logging call site coverage**: V3's logging infrastructure is complete, but
  not every V2 user action has a corresponding `applyModelChange({ log })` call
  in V3. Expanding coverage of specific user actions is a separate concern from
  the infrastructure addressed here.

## Key Files

| File | Role |
|------|------|
| `src/lib/logger.ts` | Core Logger singleton — log server, GA, listener dispatch |
| `src/lib/logger.test.ts` | Logger unit tests |
| `src/lib/cfm/cfm-log-utils.ts` | `handleLogLaraData` helper |
| `src/lib/cfm/cfm-log-utils.test.ts` | CFM log utility tests |
| `src/lib/cfm/use-cloud-file-manager.ts` | CFM configuration — `logLaraData` callback, LARA forwarding listener |
| `src/data-interactive/log-monitor-manager.ts` | Monitor registry, filter matching, notification dispatch |
| `src/data-interactive/log-monitor-manager.test.ts` | Monitor manager tests |
| `src/data-interactive/handlers/log-message-handler.ts` | Plugin `logMessage` API with topic support |
| `src/data-interactive/handlers/log-message-handler.test.ts` | Log message handler tests |
| `src/data-interactive/handlers/log-message-monitor-handler.ts` | Plugin `logMessageMonitor` register/unregister |
| `src/data-interactive/data-interactive-types.ts` | `DILogMessage` type with topic field |
| `src/utilities/url-params.ts` | `runKey` URL parameter |
