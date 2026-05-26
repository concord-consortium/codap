# CODAP-1326: Flip V3 release switches for production — Design

**Status:** Approved
**Jira:** [CODAP-1326](https://concord-consortium.atlassian.net/browse/CODAP-1326)
**Branch:** `CODAP-1326-release-switches`

## Goal

Flip three V3-internal switches in the release build so the production cutover behaves correctly:

1. Log destination → production server (host- and path-aware).
2. Default save extension → `.codap` (drop the beta-era `.codap3` precaution).
3. V2-document open behavior → treat V2 docs like any other doc (drop the beta-era auto-save disabling).

Per the V3 Release Plan (CODAP-1322): the V3 file format is now standardized, V3 owns the `.codap` extension, and we are confident V3 won't break V2 documents. The three switches reflect that.

## Switch 1: Log destination

### Current state

`v3/src/lib/logger.ts`:

- Line 13–16: `logManagerUrl` already defines both URLs (`dev` = `logger.concordqa.org`, `production` = `logger.concord.org`).
- Line 227: `sendToLoggingService()` unconditionally selects `logManagerUrl.dev`.
- Lines 225–226: stale commented-out conditional referencing `user.portal` / `productionPortal` — symbols that don't exist anywhere in v3.

V2 master (`apps/dg/core.js:209+498`) unconditionally uses the production URL. The "always production" V2 behavior is simpler than what we want here.

### Requirement

The production log server persists every log message to a permanent database. We want logs from real users only — not from dev, QA, branch deploys, or beta/staging channels.

### Solution

Replace the hardcoded `logManagerUrl.dev` with a host- and path-aware production check.

```typescript
function isProductionLogHost() {
  if (typeof window === "undefined") return false
  const host = window.location.hostname.toLowerCase()
  if (host !== "codap.concord.org" && host !== "codap3.concord.org") return false
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0]
  return firstSegment !== "beta" && firstSegment !== "staging" && firstSegment !== "branch"
}
```

Wire into `sendToLoggingService()`:

```typescript
const url = logManagerUrl[isProductionLogHost() ? "production" : "dev"]
```

Delete the stale commented-out lines 225–226.

### Behavior matrix

| URL | Production logs? | Why |
|---|---|---|
| `codap.concord.org/` | ✓ | Post-cutover production host |
| `codap.concord.org/anything` | ✓ | Same host, non-blacklisted path |
| `codap3.concord.org/` | ✓ | Current production host (real beta users) |
| `codap3.concord.org/beta/` | ✗ | Beta channel |
| `codap3.concord.org/staging/` | ✗ | Staging channel |
| `codap3.concord.org/branch/<name>/` | ✗ | Per-branch deploy |
| `localhost`, `127.0.0.1` | ✗ | Local dev (also fails `Logger.isLoggingEnabled`) |
| Other hostnames | ✗ | Not a known production host |

### Notes

- `Logger.isLoggingEnabled` (line 76–78) already gates all logging to `.concord.org` hostnames + `DEBUG_LOGGER`. The new check sits inside that gate.
- The first-segment matching mirrors the codebase's `isBeta()` pattern (in `version-utils.ts`), which checks `pathSegments.includes("beta")`. We use first-segment instead of `includes` so a branch named "beta" doesn't accidentally route to dev when accessed via `/branch/beta/` (which it shouldn't anyway, since `/branch/` itself is excluded).

## Switch 2: Default save extension

### Current state

- `v3/src/lib/cfm/use-cloud-file-manager.ts:355`: `extension: CONFIG_SAVE_AS_V2 ? "codap" : "codap3"`.
- `v3/src/lib/config.ts:6`: `CONFIG_SAVE_AS_V2 = DEBUG_SAVE_AS_V2 || isBeta()` — so any user on a `/beta/` deploy gets V2-format saves with `.codap` extension.
- `CONFIG_SAVE_AS_V2` is consulted in `serialize-document.ts:45` (chooses V2 vs V3 export) and `use-cloud-file-manager.ts:355` (extension).

### Solution

Two coupled changes:

**`v3/src/lib/cfm/use-cloud-file-manager.ts:355`** — extension becomes unconditional:

```diff
- extension: CONFIG_SAVE_AS_V2 ? "codap" : "codap3",
+ extension: "codap",
```

**`v3/src/lib/config.ts:6`** — drop the `isBeta()` trigger, keep the debug escape hatch:

```diff
- export const CONFIG_SAVE_AS_V2 = DEBUG_SAVE_AS_V2 || isBeta()
+ export const CONFIG_SAVE_AS_V2 = DEBUG_SAVE_AS_V2
```

### Behavior matrix

| Context | `CONFIG_SAVE_AS_V2` (before → after) | Save format (before → after) | Extension (before → after) |
|---|---|---|---|
| Production root path | `false` → `false` | V3 → V3 | `.codap3` → `.codap` |
| `/beta/` deploy | `true` → `false` | V2 → V3 | `.codap` → `.codap` |
| `?debug=saveAsV2` | `true` → `true` | V2 → V2 | `.codap` → `.codap` |
| Other | `false` → `false` | V3 → V3 | `.codap3` → `.codap` |

The behavior change for `/beta/` users is deliberate: post-cutover, every user saves V3 format.

### Notes

- `readableExtensions` continues to accept both `.codap` and `.codap3` on open — no change to existing test fixtures or user files.
- We are not retiring `CONFIG_SAVE_AS_V2` or `DEBUG_SAVE_AS_V2` in this story. That belongs in a follow-up cleanup.

## Switch 3: V2-document open behavior

### Current state

`v3/src/lib/cfm/handle-cfm-event.ts:107–138` disables CFM auto-save when V3 opens a V2 document outside a LARA/embedded context. The block was a beta-era precaution; its own comment says it "might be temporary until we are confident that CODAPv3 won't break v2 documents."

### Solution

Delete the entire `if (isCodapV2Document(resolvedDocument))` block and the `shouldAutoSaveDocument` flag. After the deletion, the surrounding code becomes:

```typescript
const resolvedDocument = await resolveDocument(content, metadata)
await appState.setDocument(resolvedDocument, metadata)
cfmClient.autoSave(kCFMAutoSaveInterval)
```

Clean-up:

- Remove the `isCodapV2Document` import if unused elsewhere in the file.
- Remove the `kCFMAutoSaveDisabledInterval` import if unused elsewhere in the file.
- Remove or simplify the now-stale comments about the V2 precaution.

### Behavior change

| Context | Before | After |
|---|---|---|
| LARA / embedded (V2 doc) | Auto-save on | Auto-save on (no change) |
| Non-LARA (V2 doc saved by V3) | Auto-save on | Auto-save on (no change) |
| Non-LARA (true V2 doc) | Auto-save off | Auto-save on |

Combined with Switch 2: any auto-save of a previously-V2 document writes V3 `.codap` content to the same location. No user message. The position: "This is CODAP V3; it saves files in V3 format."

### Out of scope

- In-app messaging notifying users that their V2 doc has been opened in V3. Explicitly omitted per the design decision.
- Storage-backend-aware behavior (Drive vs LARA vs local). The existing `hasInteractiveApiContext()` distinction is no longer needed once auto-save is uniformly enabled.

## Verification

### Switch 1

- Unit tests: mock `window.location` with each matrix row above; assert `isProductionLogHost()` returns the expected boolean.
- Manual: build → deploy to a branch path → confirm dev server receives traffic (network tab to `logger.concordqa.org`). Hit `codap.concord.org` root → confirm production traffic.

### Switch 2

- Manual: load app, create a new document, save → filename ends in `.codap`. Open an existing `.codap3` fixture → still loads.
- Existing serialize-document tests already cover format selection; verify they pass under the new default (`CONFIG_SAVE_AS_V2 = DEBUG_SAVE_AS_V2 = false`).

### Switch 3

- Manual: open a true V2 doc (e.g., `v3/src/test/v2/mammals.codap`) without LARA params, edit, wait 5 s → confirm auto-save fires and the resulting file is V3 format. With LARA params: same behavior, was-already-the-case.
- Existing CFM event tests: ensure none rely on the V2 auto-save-disable code path; update or remove as needed.

## Sequencing

All three switches bundled into a single PR. Final RC deadline: 2026-05-25 (extended from 2026-05-22). Release cutover: 2026-06-07.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Real users on `codap3.concord.org` outside `/` (e.g., bookmarked `/beta/`) lose their V2-format save behavior | Deliberate; beta-format saves are no longer a goal. |
| A `.codap` file the user thinks is V2 is silently overwritten with V3 content after edit | Position: V3 owns the `.codap` extension going forward; V2 retirement is announced. No code-level safeguard. |
| Branch deploys send no logs to production | Intentional; branches are dev/QA traffic. |
| New host added (e.g., `codap2.concord.org`) is forgotten in the allowlist | Allowlist is short and grep-able; future hosts must be added explicitly. |

## Follow-ups (not in this story)

- Retire `CONFIG_SAVE_AS_V2` / `DEBUG_SAVE_AS_V2` once the debug pathway is no longer needed.
- Add (or revisit) an In-app message about V2→V3 conversion if user feedback warrants it.
- Consider deleting the staging URL from `logManagerUrl` once branch/beta deploys move to a dedicated dev log target.
