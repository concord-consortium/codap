# CODAP-1112: Sync V3 Strings with POEditor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split V3's English string file into separate DG and V3 files, sync DG strings from V2 master, fix and improve the POEditor push/pull scripts, and update both V2 and V3 build skills with ownership-aware string handling.

**Architecture:** V3's `en-US.json5` is replaced by `en-US-dg.json` (DG.* strings from POEditor) and `en-US-v3.json5` (V3.* strings, locally maintained). The translation loader merges them at import time. Build scripts are updated so V3 only pushes V3.* strings and V2 only pushes DG.* strings.

**Tech Stack:** Bash scripts (POEditor API), TypeScript (translation loader), JSON5, Jira MCP, shell scripting

**Design doc:** `v3/docs/plans/2026-02-13-sync-v3-strings-poeditor-design.md`

---

### Task 1: Extract V3 strings into en-US-v3.json5

**Files:**
- Read: `v3/src/utilities/translation/lang/en-US.json5`
- Create: `v3/src/utilities/translation/lang/en-US-v3.json5`

**Step 1: Extract V3.* strings from en-US.json5**

Open `v3/src/utilities/translation/lang/en-US.json5`. Extract all lines that are:
- V3.* string entries (keys starting with `"V3.`)
- Comments that precede or are inline with V3.* entries
- The single DG.* string at line 82 (`DG.CaseTable.attribute.type.color`) which sits among V3 strings with a comment explaining its dynamic usage — this should stay with the V3 file since it's used by V3 code in a V3-specific way

Write these to a new file `en-US-v3.json5` as a valid JSON5 object. Preserve all comments exactly as they appear.

The file should start with `{` and end with `}`. Ensure no trailing commas before the closing `}`.

**Step 2: Verify the extracted file**

Run: `cd v3 && node -e "const JSON5 = require('json5'); const fs = require('fs'); const data = JSON5.parse(fs.readFileSync('src/utilities/translation/lang/en-US-v3.json5', 'utf8')); console.log(Object.keys(data).length + ' strings')"`

Expected: approximately 207 strings (206 V3.* + 1 DG.*)

**Step 3: Commit**

```bash
git add v3/src/utilities/translation/lang/en-US-v3.json5
git commit -m "CODAP-1112: extract V3 strings into en-US-v3.json5"
```

---

### Task 2: Create en-US-dg.json from V2 master

**Files:**
- Read: `lang/strings/en-US.json` (on `master` branch via `git show`)
- Create: `v3/src/utilities/translation/lang/en-US-dg.json`

**Step 1: Extract DG strings from V2 master**

```bash
git show master:lang/strings/en-US.json > /tmp/v2-en-US.json
```

The V2 file uses JSON with comments. Strip comments and output clean JSON. The root `node_modules` has `strip-json-comments` available as a library but not as a CLI tool. Use Node directly:

```bash
cd /Users/kswenson/Development/idea-dev/codap/v3
node -e "
const fs = require('fs');
const JSON5 = require('json5');
const raw = fs.readFileSync('/tmp/v2-en-US.json', 'utf8');
const data = JSON5.parse(raw);
// Filter to only DG.* keys
const dg = {};
for (const [k, v] of Object.entries(data)) {
  if (k.startsWith('DG.')) dg[k] = v;
}
fs.writeFileSync('src/utilities/translation/lang/en-US-dg.json', JSON.stringify(dg, null, 4) + '\n');
console.log(Object.keys(dg).length + ' DG strings written');
"
```

Expected: ~1,144 DG strings written.

**Step 2: Verify the file is valid JSON**

```bash
node -e "const data = require('./src/utilities/translation/lang/en-US-dg.json'); console.log(Object.keys(data).length + ' strings')"
```

**Step 3: Commit**

```bash
git add v3/src/utilities/translation/lang/en-US-dg.json
git commit -m "CODAP-1112: create en-US-dg.json from V2 master DG strings"
```

---

### Task 3: Update translation loader (languages.ts)

**Files:**
- Modify: `v3/src/utilities/translation/languages.ts:1-2,32`
- Modify: `v3/src/utilities/translation/translate.test.ts:3`

**Step 1: Update the English import in languages.ts**

Replace line 1:
```typescript
import enUS from "./lang/en-US.json5"
```

With:
```typescript
import enUSDG from "./lang/en-US-dg.json"
import enUSV3 from "./lang/en-US-v3.json5"
const enUS = { ...enUSDG, ...enUSV3 }
```

No other changes needed — the `enUS` variable is used on line 32 as before.

**Step 2: Update the test mock**

In `translate.test.ts`, the mock on line 3 references `./lang/en-US.json5`. This needs to be updated to mock both files:

Replace:
```typescript
jest.mock("./lang/en-US.json5", () => ({
  HELLO: "Hello",
  NAMED: "Replace %{foo} with %{bar}",
  INDEXED: "Replace %@1 with %@2",
  REVERSED: "Replace %@2 with %@1",
  POSITIONED: "Replace %@ with %@",
  EMPTY_NAMED: "Replace %{foo} with %{}"
}))
```

With:
```typescript
jest.mock("./lang/en-US-dg.json", () => ({
  HELLO: "Hello",
  NAMED: "Replace %{foo} with %{bar}",
  INDEXED: "Replace %@1 with %@2",
  REVERSED: "Replace %@2 with %@1",
  POSITIONED: "Replace %@ with %@",
  EMPTY_NAMED: "Replace %{foo} with %{}"
}))

jest.mock("./lang/en-US-v3.json5", () => ({}))
```

**Step 3: Run tests to verify**

Run: `cd v3 && npm test -- --testPathPattern="translate" --no-coverage`

Expected: All translate tests pass.

**Step 4: Commit**

```bash
git add v3/src/utilities/translation/languages.ts v3/src/utilities/translation/translate.test.ts
git commit -m "CODAP-1112: update translation loader to merge DG and V3 string files"
```

---

### Task 4: Remove old en-US.json5

**Files:**
- Delete: `v3/src/utilities/translation/lang/en-US.json5`

**Step 1: Verify no other imports reference the old file**

Search for references to `en-US.json5` (not `en-US-v3.json5` or `en-US-dg.json`):

```bash
cd v3 && grep -r "en-US.json5" src/ --include="*.ts" --include="*.tsx" --include="*.js"
```

Expected: No results (the import was already updated in Task 3).

Also check webpack config and jest config — both reference `.json5` extension generically (not the specific filename), so they should handle `en-US-v3.json5` automatically.

**Step 2: Delete the file**

```bash
git rm v3/src/utilities/translation/lang/en-US.json5
```

**Step 3: Run tests to verify nothing broke**

Run: `cd v3 && npm test -- --testPathPattern="translate" --no-coverage`

Expected: All tests still pass.

**Step 4: Run full build to verify**

Run: `cd v3 && npm run build:tsc`

Expected: TypeScript compilation succeeds.

**Step 5: Commit**

```bash
git commit -m "CODAP-1112: remove old combined en-US.json5"
```

---

### Task 5: Sync and update strings-pull.sh

**Files:**
- Modify: `v3/scripts/strings-pull.sh`
- Read (reference): V2's `bin/strings-pull.sh` via `git show master:bin/strings-pull.sh`

**Step 1: Port V2 improvements**

The V2 version has better documentation comments (header block explaining usage, API, output). The core logic is identical. Update `v3/scripts/strings-pull.sh` to:

1. Add the V2 header documentation block (adjusting paths: `./bin/` → `./scripts/`)
2. Use V2's improved inline comments (`# Step 1:`, `# Step 2:`)

No functional changes needed — the pull logic (export API call, URL extraction, download with Unicode fix) is identical.

**Step 2: Verify the script is syntactically valid**

```bash
bash -n v3/scripts/strings-pull.sh
```

Expected: No errors.

**Step 3: Commit**

```bash
git add v3/scripts/strings-pull.sh
git commit -m "CODAP-1112: sync strings-pull.sh with V2 master improvements"
```

---

### Task 6: Sync and update strings-pull-project.sh

**Files:**
- Rewrite: `v3/scripts/strings-pull-project.sh`

**Step 1: Port V2 improvements and add V3-specific features**

The V2 version has significant improvements over V3:
- Timeout protection (`run_with_timeout` function — portable, works on macOS)
- Retry logic (`MAX_RETRIES=3`)
- Download verification (checks file exists, is non-empty, starts with `{`)
- Progress reporting with summary table

Rewrite `v3/scripts/strings-pull-project.sh` based on the V2 version, with these V3 adaptations:

1. **Remove SproutCore conversion** — V2's `install_language()` converts JSON to `SC.stringsFor()` format. V3 keeps raw JSON files. Remove this function and just leave downloaded `.json` files in place.
2. **Remove English JS conversion** — V2 converts `en-US.json` to `english.lproj/strings.js`. Not needed in V3.
3. **Update paths** — `./bin/strings-pull.sh` → `./scripts/strings-pull.sh`, output dir `lang/strings` → `src/utilities/translation/lang`
4. **Update language list** — Use V3's list: `de el es fa he ja ko nb nn pt-BR th tr zh-TW zh-Hans` (V3 includes `ko` but not `fr`, `nl`, `pl` which V2 recently added — keep V3's current list for now)
5. **Add en-US pull with DG/V3 split** — After pulling all non-English languages, also pull `en-US` and split it:
   - Pull en-US to temp file
   - Use `node` + `json5` to split into DG.* and V3.* keys
   - Overwrite `en-US-dg.json` with the DG.* keys
   - Write V3.* keys to a temp file for later comparison (the caller/build skill handles the diff)
   - Print summary of DG changes detected

The en-US split logic (Node script inline in bash):
```bash
# Split en-US into DG and V3 files
node -e "
const fs = require('fs');
const pulled = JSON.parse(fs.readFileSync('$OUTPUT_DIR/en-US.json', 'utf8'));
const dg = {}, v3 = {};
for (const [k, v] of Object.entries(pulled)) {
  if (k.startsWith('V3.')) v3[k] = v;
  else dg[k] = v;
}
fs.writeFileSync('$OUTPUT_DIR/en-US-dg.json', JSON.stringify(dg, null, 4) + '\n');
fs.writeFileSync('/tmp/poeditor-v3-strings.json', JSON.stringify(v3, null, 4) + '\n');
console.log('  DG strings: ' + Object.keys(dg).length);
console.log('  V3 strings: ' + Object.keys(v3).length);
"
rm "$OUTPUT_DIR/en-US.json"  # Remove the combined download
```

**Step 2: Verify the script is syntactically valid**

```bash
bash -n v3/scripts/strings-pull-project.sh
```

**Step 3: Commit**

```bash
git add v3/scripts/strings-pull-project.sh
git commit -m "CODAP-1112: rewrite strings-pull-project.sh with V2 improvements and DG/V3 split"
```

---

### Task 7: Sync and update strings-push.sh

**Files:**
- Modify: `v3/scripts/strings-push.sh`

**Step 1: Port V2 improvements**

Key differences from V2 master:
1. **`SYNC_TERMS` must be `"0"`** — V3's version still has `SYNC_TERMS="1"` which is dangerous (would delete V2's terms). V2 already fixed this.
2. **Better comments** — V2 has inline comments explaining each parameter (`updating`, `overwrite`, `sync_terms`, `fuzzy_trigger`).
3. **JSON5 support** — V3 needs to handle `.json5` input files. The V2 version uses `strip-json-comments` CLI. V3 doesn't have that CLI binary but has the `json5` npm package. Replace the `strip-json-comments` pipe with a Node one-liner that parses JSON5 and outputs JSON.

Update the script:
1. Set `SYNC_TERMS="0"` with the V2 comment explaining why
2. Add all V2 documentation comments
3. Replace the comment-stripping pipeline. The current V3 line:
   ```bash
   ./node_modules/.bin/strip-json-comments "$INPUT_FILE" | \
       sed 's/"[ ]*:[ ]*""/": "[u200b]"/g' | \
       $CURL $CURLARGS $POEDITOR_UPLOAD_URL
   ```
   Replace with:
   ```bash
   node -e "
   const fs = require('fs');
   const JSON5 = require('json5');
   const data = JSON5.parse(fs.readFileSync('$INPUT_FILE', 'utf8'));
   // Convert empty strings to zero-width space for POEditor
   for (const k of Object.keys(data)) { if (data[k] === '') data[k] = '\u200b'; }
   process.stdout.write(JSON.stringify(data));
   " | $CURL $CURLARGS $POEDITOR_UPLOAD_URL
   ```

**Step 2: Verify syntax**

```bash
bash -n v3/scripts/strings-push.sh
```

**Step 3: Commit**

```bash
git add v3/scripts/strings-push.sh
git commit -m "CODAP-1112: sync strings-push.sh with V2 fixes (sync_terms=0) and add JSON5 support"
```

---

### Task 8: Update strings-push-project.sh for V3-only push

**Files:**
- Modify: `v3/scripts/strings-push-project.sh`

**Step 1: Update to push only V3.* strings**

The current script pushes `lang/strings/en-US.json` which doesn't exist in V3. Replace with a script that:
1. Reads `en-US-v3.json5`
2. Parses JSON5, extracts only V3.* keys
3. Writes a temp JSON file with just V3.* strings
4. Calls `strings-push.sh` with the temp file
5. Cleans up

```bash
#!/bin/bash
#
# Push V3-specific strings to POEditor.
#
# Only pushes strings with V3.* keys — DG.* strings are owned by the V2 build.
# Uses additive mode (sync_terms=0) so no terms are deleted.
#
# Usage: ./scripts/strings-push-project.sh -a <api_token>
#
PROJECT_ID="125447"
INPUT_FILE="src/utilities/translation/lang/en-US-v3.json5"
TEMP_FILE="/tmp/v3-strings-push.json"

# argument processing
while [[ $# -gt 1 ]]
do
key="$1"
case $key in
    -a|--api_token)
    API_TOKEN="$2"
    shift
    ;;
esac
shift
done

# Extract V3-only strings from JSON5 source
node -e "
const fs = require('fs');
const JSON5 = require('json5');
const data = JSON5.parse(fs.readFileSync('$INPUT_FILE', 'utf8'));
const v3 = {};
for (const [k, v] of Object.entries(data)) {
  if (k.startsWith('V3.')) v3[k] = v;
}
fs.writeFileSync('$TEMP_FILE', JSON.stringify(v3));
console.log('Pushing ' + Object.keys(v3).length + ' V3 strings to POEditor...');
"

PUSHARGS="-p $PROJECT_ID -i $TEMP_FILE -a $API_TOKEN"
./scripts/strings-push.sh $PUSHARGS
RESULT=$?

rm -f "$TEMP_FILE"
exit $RESULT
```

**Step 2: Verify syntax**

```bash
bash -n v3/scripts/strings-push-project.sh
```

**Step 3: Commit**

```bash
git add v3/scripts/strings-push-project.sh
git commit -m "CODAP-1112: update strings-push-project.sh to push only V3 strings"
```

---

### Task 9: Update npm scripts in package.json

**Files:**
- Modify: `v3/package.json` (lines 74-78, the `strings:*` scripts)

**Step 1: Update the strings:update script order**

Currently:
```json
"strings:update": "npm-run-all strings:push strings:pull"
```

Change to pull-first order (so DG strings are updated before any push):
```json
"strings:update": "npm-run-all strings:pull strings:push"
```

The `strings:pull` and `strings:push` script values themselves don't change (they still call the project-level shell scripts).

**Step 2: Commit**

```bash
git add v3/package.json
git commit -m "CODAP-1112: change strings:update to pull-first order"
```

---

### Task 10: Run full test suite

**Files:** None (verification only)

**Step 1: Run TypeScript compilation**

```bash
cd v3 && npm run build:tsc
```

Expected: No errors.

**Step 2: Run full Jest test suite**

```bash
cd v3 && npm test -- --no-coverage
```

Expected: All tests pass. Watch for failures related to translation imports.

**Step 3: Run lint**

```bash
cd v3 && npm run lint
```

Expected: No new lint errors.

**Step 4: If any failures, fix and amend the relevant commit**

---

### Task 11: Update codap-v3-build skill

**Files:**
- Modify: `.claude/skills/codap-v3-build/SKILL.md`

**Step 1: Add string sync to Phase 2 or as a new pre-build step**

The V3 build skill currently has no string sync step. Add a new section to the skill (modeled after the V2 build skill's Phase 2 Step 4) that implements the workflow from the design doc's "Build-Time String Sync (V3)" section.

Insert after Phase 1 (Prepare the Release) or at the beginning of Phase 2 (which doesn't exist yet — this would be Phase 2: Pre-Build Preparation, and the current Phase 2-6 shift down by one). Alternatively, add it as a step within the existing Phase 1 before the build step.

The string sync section should describe:

1. **Pull en-US from POEditor** — run `npm run strings:pull` which pulls all languages including en-US and splits DG/V3
2. **Report DG string changes** — show the user what DG strings changed (informational)
3. **Reconcile V3 strings** — compare POEditor's V3 strings (in `/tmp/poeditor-v3-strings.json` from the pull script) against local `en-US-v3.json5`:
   - Local-only: "These new V3 strings will be pushed"
   - POEditor-only: "These V3 strings exist in POEditor but not locally. Merge?"
   - Value differs: "These V3 strings differ. Push local values?"
4. **Push V3 strings** — run `npm run strings:push` (pushes only V3.* strings)
5. **Commit string changes** if any files changed

**Step 2: Commit**

```bash
git add .claude/skills/codap-v3-build/SKILL.md
git commit -m "CODAP-1112: add string sync workflow to codap-v3-build skill"
```

---

### Task 12: Update codap-v2-build skill

**Files:**
- Modify: `.claude/skills/codap-v2-build/SKILL.md` (on `master` branch — this will require a separate commit on master or a note for manual application)

**Important:** The V2 build skill lives on the `master` branch. Since we're working on `main`, we have two options:
1. Cherry-pick the skill change to `master` after merging this PR
2. Make the change directly on `master` in a separate commit

For now, prepare the changes as a file that can be applied to master later.

**Step 1: Document the V2 skill changes needed**

In the V2 build skill's Phase 2, Step 4 (Update CODAP translations), the following changes are needed:

- **4a. Compare local English strings with POEditor:** After the existing diff, categorize differences by ownership:
  - DG.* differences → existing behavior (ask user to confirm push)
  - V3.* differences → inform user: "V3 made these string changes in POEditor: [list]. These will be accepted into your local file."
- **Push filtering:** Before pushing, filter the local file to only include DG.* keys. Use a Node one-liner to extract DG.* keys and write to a temp file, then push the temp file instead of the full source.

Create a notes file documenting these changes:

**Step 2: Create V2 skill change notes**

Create `v3/docs/plans/v2-build-skill-string-changes.md` with the specific edits to apply to the V2 skill on master.

**Step 3: Commit**

```bash
git add v3/docs/plans/v2-build-skill-string-changes.md
git commit -m "CODAP-1112: document V2 build skill changes for ownership-aware string handling"
```

---

### Task 13: Push V3 strings to POEditor (one-time)

**This task requires a POEditor API token and should be done interactively with the user.**

**Step 1: Verify the push script works**

Ask the user for their POEditor API token (or confirm `~/.porc` is set up).

```bash
cd v3 && npm run strings:push -- -a <TOKEN>
```

Expected: POEditor API returns success, reports ~206 terms added/updated.

**Step 2: Verify strings appear in POEditor**

Pull en-US back from POEditor and verify V3 strings are present:

```bash
cd v3 && ./scripts/strings-pull.sh -p 125447 -l en-US -o /tmp -a <TOKEN>
node -e "const d = require('/tmp/en-US.json'); const v3 = Object.keys(d).filter(k => k.startsWith('V3.')); console.log(v3.length + ' V3 strings in POEditor')"
```

Expected: ~206 V3 strings.

---

### Task 14: Final verification and cleanup

**Step 1: Run full test suite**

```bash
cd v3 && npm test -- --no-coverage
```

**Step 2: Run lint**

```bash
cd v3 && npm run lint
```

**Step 3: Run TypeScript build**

```bash
cd v3 && npm run build:tsc
```

**Step 4: Verify the translation system works end-to-end**

```bash
cd v3 && node -e "
const JSON5 = require('json5');
const fs = require('fs');
const dg = JSON.parse(fs.readFileSync('src/utilities/translation/lang/en-US-dg.json', 'utf8'));
const v3 = JSON5.parse(fs.readFileSync('src/utilities/translation/lang/en-US-v3.json5', 'utf8'));
const merged = { ...dg, ...v3 };
const dgCount = Object.keys(merged).filter(k => k.startsWith('DG.')).length;
const v3Count = Object.keys(merged).filter(k => k.startsWith('V3.')).length;
console.log('Merged: ' + dgCount + ' DG strings + ' + v3Count + ' V3 strings = ' + Object.keys(merged).length + ' total');
"
```

Expected: ~1,144 DG + ~207 V3 strings.

**Step 5: Clean up temp files**

```bash
rm -f /tmp/v2-en-US.json /tmp/poeditor-v3-strings.json /tmp/v3-strings-push.json
```
