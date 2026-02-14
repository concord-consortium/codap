# V2 Build Skill: Ownership-Aware String Handling

**Context:** CODAP-1112 established an ownership model where V2 owns DG.* strings and V3 owns V3.* strings. Both share POEditor project 125447. The V3 build skill has been updated; these are the corresponding changes needed in the V2 build skill on the `master` branch.

**File:** `.claude/skills/codap-v2-build/SKILL.md`

## Changes to Phase 2, Step 4 (Update CODAP translations)

### 4a. Compare local English strings with POEditor

After the existing diff analysis, categorize differences by ownership:

- **DG.* differences** — existing behavior (V2-owned, ask user to confirm push)
- **V3.* differences** — inform user: "V3 made these string changes in POEditor: [list]. These will be accepted into your local file." Accept V3 changes by updating the local `lang/strings/en-US.json` with the POEditor values for V3.* keys.

Add this analysis step after the existing diff:

```bash
# Categorize differences by ownership
node -e "
const local = require('/tmp/local-en.json');
const remote = require('/tmp/poeditor-en.json');
const dgDiffs = [], v3Diffs = [];
for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
  if (local[k] !== remote[k]) {
    (k.startsWith('V3.') ? v3Diffs : dgDiffs).push(k);
  }
}
if (v3Diffs.length) console.log('V3 changes from POEditor (will be accepted):', v3Diffs.join(', '));
if (dgDiffs.length) console.log('DG changes to push:', dgDiffs.join(', '));
"
```

### Push filtering

Before pushing, filter the local file to only include DG.* keys. Replace the direct push of `lang/strings/en-US.json` with:

```bash
# Extract DG-only strings for push (V3 strings are managed by the V3 build)
node -e "
const fs = require('fs');
const stripComments = require('strip-json-comments');
const raw = fs.readFileSync('lang/strings/en-US.json', 'utf8');
const data = JSON.parse(stripComments(raw));
const dg = {};
for (const [k, v] of Object.entries(data)) {
  if (k.startsWith('DG.')) dg[k] = v;
}
fs.writeFileSync('/tmp/dg-strings-push.json', JSON.stringify(dg));
console.log('Pushing ' + Object.keys(dg).length + ' DG strings (filtering out ' +
  (Object.keys(data).length - Object.keys(dg).length) + ' V3 strings)');
"

./bin/strings-push.sh -p 125447 -i /tmp/dg-strings-push.json -a "$API_TOKEN"
rm -f /tmp/dg-strings-push.json
```

### Summary of intent

- V2 push sends only DG.* keys (no longer sends V3.* keys that happen to be in the local file)
- V3 changes from POEditor are reported to the user and accepted locally
- No changes to the pull step (pulls still get all strings for all languages)
