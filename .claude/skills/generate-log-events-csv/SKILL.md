---
name: generate-log-events-csv
description: Use when regenerating, updating, or auditing the CODAP v3 log-events dictionary CSV (the list of every log event the v3 app can emit, with placeholders/parameters/descriptions). Also use to check whether the code and the dictionary have drifted.
---

# Generate Log Events CSV

## Overview

Regenerates `codap-v3-log-events.csv` (in this skill folder): a dictionary of every log
event the CODAP v3 app can emit, in the column format shared with the other Concord log
dictionaries:

| Column | Meaning |
|--------|---------|
| **Event** | The message template, with `%@` placeholder slots kept in place (the stable event identifier). |
| **Placeholders** | The values interpolated into the `%@` slots, in order. v3 bakes its "primary value" into the event string, so this is the closest analog to `event_value` in the other apps. |
| **Value** | Always empty. v3's logger has no distinct `event_value` field (it just sets `event_value = JSON.stringify(args)`); the column is kept for parity with the other dictionaries. |
| **Parameters** | The `args` object logged alongside the event, as `{ key: type }`. |
| **Description** | Plain-language description of the user action / condition that triggers the event. |

There is deliberately **no Source column** in the output.

## How it works

The mechanical work is done by committed scripts so this does not have to be re-derived
from the code each time:

- **`extract-log-events.mjs`** parses every non-test file under `v3/src` with the
  TypeScript compiler API and emits one record per distinct Event. It captures every
  log-emitting form: the `logMessageWithReplacement` / `logStringifiedObjectMessage` /
  `logModelChangeFn` helpers, `Logger.log`, and `log:` / `log =` / `const log =` payloads
  that are bare strings, template literals, inline `{ message, args }` objects, or
  ternaries. Ternary messages are split into one row per branch (each string is a distinct
  event in the real logs). The data-interactive `logMessage` handler forwards a
  plugin-defined event, represented by the single `<plugin-defined>` row.
- **`build-csv.mjs`** merges that extraction with the existing committed CSV, **preserving
  curated Placeholders / Parameters / Descriptions** by matching on the Event string, and
  reports NEW events (found in code, not yet in the CSV) and REMOVED events (in the CSV,
  no longer in code).
- **`generate-log-events-csv.sh`** runs both in sequence and writes the CSV.

What the scripts **cannot** do, and what this skill is for: author the human
**Description** for a new event, and refine the **Parameters** value types and the
**Placeholders** of `logModelChangeFn` events (whose values come from a model-state
function). The extractor leaves those best-effort or blank for new events; a human/Claude
fills them in.

## Steps

1. **Run the generator** (requires v3 deps installed so `typescript` resolves; run
   `npm install` in `v3` first if needed):

   ```bash
   ./.claude/skills/generate-log-events-csv/generate-log-events-csv.sh
   ```

   To only detect drift without writing (e.g. in CI), add `--check`; it exits non-zero if
   there are NEW or REMOVED events.

2. **Handle NEW events.** For each `+` event reported (its source `file:line` is printed),
   open that call site, then edit `codap-v3-log-events.csv` to:
   - write a concise, plain-language **Description** of the triggering user action;
   - fill the value types in **Parameters** (e.g. `{ count: number }`);
   - for `logModelChangeFn` events, set **Placeholders** to the initial-then-final value
     names (e.g. `xInitial, yInitial, x, y`).

   Placeholder semantics when authoring:
   - `logMessageWithReplacement(msg, args)` → `%@` slots filled by the args values in order → Placeholders = the arg keys in order.
   - `logStringifiedObjectMessage(msg, args)` → one `%@` filled by the whole stringified object → Placeholders = `{ key1, key2 }`.
   - template literal `${x}` in the message → Placeholders = `x`.

3. **Confirm REMOVED events** were intentionally dropped from the code (a `-` line means
   the code no longer emits that event). If a removal is expected, nothing to do; the row
   is already gone from the CSV.

4. **Re-run** the generator and confirm it reports `0` NEW / `0` REMOVED and no rows with
   an empty Description.

5. **Recommend updating the Google Sheet.** After the CSV is regenerated, recommend the
   user update **both the content and the filename** of the published sheet:
   <https://docs.google.com/spreadsheets/d/1XTar6xGhLN7U72Nyr9lmU-1xzIE5ydHCwnL67uBsL04/edit>
   - **Content:** File → Import → Upload the regenerated `codap-v3-log-events.csv` →
     "Replace current sheet" (keeps the same file/URL).
   - **Filename:** rename it to `CODAP Log Events (Month DD, YYYY)` using the current date,
     since the title carries the date it was generated.

   Do not edit the sheet automatically; present the recommendation and let the user apply it.

## Notes

- The CSV is committed as the source of record so descriptions survive regeneration; keep
  it in version control.
- Rows are sorted case-insensitively by Event.
- If the extractor ever reports a surprising drop in event count, a new log-emitting form
  may have been introduced that its AST visitor does not recognize (currently: the three
  helpers, `Logger.log`, and `log:` / `log =` / `const log =` payloads). Extend
  `extract-log-events.mjs` to cover it.
