# CODAP-1112: Sync V3 Strings with POEditor

## Context

CODAP V2 and V3 share a single POEditor project (ID 125447). V2 stores strings in `lang/strings/en-US.json` on the `master` branch. V3 started with a copy of that file as `v3/src/utilities/translation/lang/en-US.json5` on `main`, but the two have diverged:

- V2 (master): 1,144 DG.* strings
- V3 (main): 963 DG.* strings (stale) + 206 V3.* strings

POEditor is the source of truth. Neither V2 nor V3 should delete strings from POEditor during normal builds (`sync_terms` has been removed from the push process).

## Ownership Model

During the interim period where both V2 and V3 are being built:

- **V2 build owns DG.* strings** — only pushes DG.* changes to POEditor
- **V3 build owns V3.* strings** — only pushes V3.* changes to POEditor
- Each build accepts the other's string changes from POEditor into its local files

## File Structure

### Current

```
v3/src/utilities/translation/lang/
  en-US.json5       (963 DG + 206 V3 strings mixed together)
  de.json            (all strings from POEditor)
  es.json            ...
  [other langs].json
```

### New

```
v3/src/utilities/translation/lang/
  en-US-v3.json5    (V3.* strings only, JSON5 with comments, maintained by V3 devs)
  en-US-dg.json     (DG.* strings only, plain JSON, overwritten by POEditor pulls)
  de.json            (all strings from POEditor -- unchanged)
  es.json            ...
  [other langs].json
```

- `en-US-v3.json5` is the only file V3 developers edit for new strings.
- `en-US-dg.json` is never manually edited; it is overwritten by POEditor pulls.
- Non-English language files are unchanged: each contains all strings (DG + V3) from POEditor.

## Translation Loader Changes

`languages.ts` currently imports:

```typescript
import enUS from "./lang/en-US.json5"
```

New:

```typescript
import enUSDG from "./lang/en-US-dg.json"
import enUSV3 from "./lang/en-US-v3.json5"
const enUS = { ...enUSDG, ...enUSV3 }
```

V3 values take precedence on any key conflict. No changes needed for other languages.

## Build-Time String Sync (V3)

Integrated into the `codap-v3-build` skill, this is the sync workflow run during pre-build preparation:

### Step 1: Pull en-US from POEditor

Download en-US as JSON to a temp file. Split the download into DG strings (keys starting with `DG.`) and V3 strings (keys starting with `V3.`).

### Step 2: Update DG strings (not owned by V3)

Overwrite `en-US-dg.json` with the DG strings from the download. If there are differences from the previous file, inform the user what changed (informational — DG strings always come from POEditor).

### Step 3: Reconcile V3 strings (owned by V3)

Diff the V3 strings from POEditor against local `en-US-v3.json5`:

- **Local-only** (new V3 strings not yet in POEditor): inform user these will be pushed.
- **POEditor-only** (V3 strings in POEditor but not local): ask user whether to merge locally.
- **Value differs** (same key, different English text): ask user whether to push local values.

### Step 4: Push V3 strings to POEditor

Extract V3.* keys from `en-US-v3.json5`, strip JSON5 comments, convert to JSON, push to POEditor (additive only, no `sync_terms`).

### Step 5: Pull all other languages

Pull each non-English language from POEditor, overwriting the corresponding `.json` file. These contain all strings (DG + V3).

## Build-Time String Sync (V2)

Mirror of the V3 workflow, integrated into the `codap-v2-build` skill:

- When diffing local vs POEditor, categorize changes by ownership (DG.* vs V3.*).
- DG.* differences: existing behavior — ask user to confirm push.
- V3.* differences: inform user that V3 made these changes, accept them locally.
- Push only DG.* strings (filter out V3.* before upload).

## Script Sync

The V3 scripts in `v3/scripts/` were originally copied from V2's `bin/` scripts but have diverged. Before applying V3-specific changes, sync improvements made on `master`:

| V2 (master) | V3 (main) |
|---|---|
| `bin/strings-pull.sh` | `v3/scripts/strings-pull.sh` |
| `bin/strings-pull-project.sh` | `v3/scripts/strings-pull-project.sh` |
| `bin/strings-push.sh` | `v3/scripts/strings-push.sh` |
| `bin/strings-push-project.sh` | `v3/scripts/strings-push-project.sh` |

For each pair: diff V2 vs V3, port V2 improvements, then apply V3-specific changes (JSON5 handling, V3-only filtering, en-US pull + split).

## Initial Sync (One-Time Migration)

1. Extract V3.* strings from current `en-US.json5` into `en-US-v3.json5` (preserving comments).
2. Take V2 master's `lang/strings/en-US.json` (1,144 DG strings), strip comments, save as `en-US-dg.json`.
3. Remove old `en-US.json5`.
4. Update `languages.ts` to import and merge both files.
5. Sync V3 scripts with V2 master versions, then apply V3-specific changes.
6. Push V3 strings to POEditor (one-time, adds 206 V3 terms).
7. Update `codap-v3-build` skill with string sync workflow.
8. Update `codap-v2-build` skill with ownership-aware string handling.

## Out of Scope

- Deleting stale strings from POEditor
- Automating non-English string handling beyond the existing pull scripts
- Changes to the V3 translation runtime beyond the English loader merge
