---
name: codap-v3-build
description: Use when preparing a CODAP v3 release, creating release notes, updating version files, creating release PRs, tagging releases, or deploying to staging/production. Invoke with phase name or version number to resume.
---

# CODAP v3 Build & Release

## Overview

Interactive workflow for CODAP v3 releases. Guides you through Jira setup, release notes generation, version updates, PR creation, tagging, and deployment.

## Quick Reference

| Phase | Command | Description |
|-------|---------|-------------|
| 1 | `/codap-v3-build` | Prepare release (Jira version, tag stories) |
| 2 | `/codap-v3-build notes` | Prepare release notes (interactive) |
| 3 | `/codap-v3-build files` | Update version files |
| 4 | `/codap-v3-build pr` | Create release PR |
| 5 | `/codap-v3-build tag` | Tag the release (triggers S3 build) |
| 6 | `/codap-v3-build deploy [version]` | Deploy to staging/production, publish GitHub release |
| fix | `/codap-v3-build fix {old-version}` | Revise release after staging QA failure |

## Getting Started

When invoked, introduce the skill:

> This skill will walk you through the process of building a release of CODAP v3. The process has 6 phases:
>
> 1. **Prepare the Release** - Set up Jira version and gather context
> 2. **Prepare Release Notes** - Interactive walkthrough to create CHANGELOG entry
> 3. **Update Version Files** - Update package.json, versions.md, CHANGELOG.md
> 4. **Create Release PR** - Build, capture asset sizes, create PR
> 5. **Tag** - After PR merge, create git tag (triggers the S3 build)
> 6. **Deploy** - Stage, QA, deploy to production, then publish the GitHub release
>
> Are you ready to proceed?

Wait for user confirmation before starting Phase 1.

## Phase 1: Prepare the Release

**Goal:** Create Jira release version and gather context.

### Steps

1. **Check workspace status:**
   ```bash
   git status
   ```

   - If there are modified/staged files, ask user to: **Stash** / **Commit** / **Discard**
   - Untracked files are okay to leave

2. **Ensure on main branch with latest:**
   ```bash
   git checkout main
   git pull
   ```

3. **Get current build number:**
   ```bash
   cat v3/build_number.json
   ```

   Needed for the version string only in the pre-release phase (see step 6), but always
   worth showing as context.

4. **Get previous release tag:**
   ```bash
   git tag --sort=-creatordate | head -5
   ```

5. **Show context to user:**
   - Display last 3 releases (version and date)
   - Show current build number from `build_number.json`

6. **Determine recommended version string:**

   CODAP v3 has **two versioning conventions**, one per development phase. Identify the
   current phase from the newest release tag, then apply that phase's rule.

   ```bash
   git tag --sort=-creatordate | head -3
   ```

   | Phase | You are here when… | Version format | Rule |
   |-------|--------------------|----------------|------|
   | **Production release** | The newest release tag is plain semver with **no** prerelease suffix (`3.0.4`, `3.1.2`) | `MAJOR.MINOR.PATCH` | Increment from the last released version: **patch** for bug fixes, **minor** for new features, **major** for breaking changes. Example: after `3.0.4` → `3.0.5`. |
   | **Pre-release development** | The newest release tag carries a prerelease suffix (`-beta`, `-rc`, `-pre`) | `{major}.{minor}.{patch}-{suffix}.{buildNumber}` | Use build number **+ 1** (it auto-increments when the release PR merges), carrying over the previous tag's version prefix and suffix. Example: newest tag `3.0.0-beta.2662` with build `2662` → `3.0.0-beta.2663`. |

   **The build number is part of the version string ONLY in the pre-release phase.**
   In the production phase the build number still exists and still increments, but it is
   independent of the version — do **not** derive the version from `build_number.json`.
   (At the 3.0.5 release the build number was 2956, heading to 2957 on merge, while the
   version was `3.0.5`. The two are unrelated and will never match again.)

   CODAP v3 entered the production phase at `3.0.0` on 2026-06-04. The pre-release rule
   is retained because the project may re-enter a pre-release phase for a future major
   version (e.g. a `4.0.0-beta.N` series), at which point it applies again.

   **Which component to bump** is a judgment call about the release's contents, not a
   mechanical rule — propose one and confirm it with the user along with the rest of the
   Jira release details (step 8).

7. **Get previous release date from Jira** (for start date default)

8. **Ask user for Jira release details:**

   | Field | Default | Options |
   |-------|---------|---------|
   | Version name | The phase-appropriate next version from step 6 | Production phase: patch / minor / major bump. Pre-release phase: previous suffix + new build number |
   | Start date | Previous release date | User can modify |
   | Release date | Today's date | Today / Tomorrow / Custom future date |
   | Description | `Version {version}` | User can modify |

   **Note:** The release date chosen here is used throughout the process:
   - CHANGELOG.md header date
   - versions.md entry date
   - Jira release date

9. **Ensure the Jira release version exists** (status: `Unreleased`).

   **The Atlassian MCP tools cannot create a version or edit its release date** — they
   expose no version-management tool. This step is the user's to perform, in the Jira UI
   (CODAP → Releases). Setting issue Fix Versions (Phase 2, step 9) works fine through
   MCP; it is only the version object itself that is out of reach.

   - **Check whether it already exists first** — Jira automation may have created the
     version (and a `Release {version}` tracking issue) ahead of time. You can see
     existing versions via the `fixVersions` field on issues (JQL).
   - If it exists, confirm its release date matches the date agreed in step 8; if it
     doesn't, ask the user to correct it.
   - If it doesn't exist, ask the user to create it with the agreed name, dates, and
     description, and to confirm once done.

   The date only has to be correct before the release is marked `Released` in Phase 6, so
   this need not block the rest of the workflow.

## Phase 2: Prepare Release Notes

**Goal:** Generate CHANGELOG entry with user-selected titles.

### Steps

1. **Get PRs since last release:**
   ```bash
   git log <last-tag>..HEAD --oneline | grep -E '\(#[0-9]+\)|Merge pull request #[0-9]+'
   ```

   **Note:** This finds both regular merge commits AND squash-merged PRs (which include `(#123)` in the commit message). Using `--merges` alone misses squash merges.

2. **Get PR details from GitHub:**
   ```bash
   gh pr view <number> --json number,title,headRefName
   ```

3. **Match PRs to Jira stories by CODAP-XXX ID:**
   - Check branch name first (most reliable, e.g., `CODAP-1027-inbounds-url-param`)
   - Then PR title (e.g., `CODAP-1027: Implement inbounds parameter`)
   - Use caution with PR descriptions - they may reference related stories (e.g., "Follow-up to CODAP-XXX") that aren't the primary story for this PR
   - Extract unique CODAP-XXX IDs

4. **For each matched item, fetch:**
   - Jira story details (summary, issue type, **current status**)
   - PR title from GitHub
   - Generate AI-suggested title (concise, user-focused)

5. **Interactive walkthrough for each item:**

   **IMPORTANT - NO SHORTCUTS:**
   - Do NOT ask user to approve the entire list at once
   - Do NOT batch items together (e.g., "approve these 3 items")
   - Do NOT skip showing title options
   - ALWAYS go through items ONE BY ONE, presenting all title options for each

   **IMPORTANT - PRESENTATION ORDER:**
   Present the title options table as markdown output FIRST, then use AskUserQuestion. This prevents the question UI from covering the options.

   First, output this markdown:
   ```
   ### Item 1/8: CODAP-1027 (Story)

   | Source | Title |
   |--------|-------|
   | **AI suggestion** | {ai_title} |
   | **Jira** | {jira_summary} |
   | **PR** | {pr_title} |
   ```

   **Note:** Strip Jira IDs from PR titles before presenting (e.g., "CODAP-138: Fix point color" → "Fix point color")

   **Jira status notice (if not Done):**
   If the story's Jira status is anything other than "Done" (e.g., "In Project Team Review", "In Code Review"), append the status to the item header line with a warning indicator:
   ```
   ### Item 1/8: CODAP-1027 (Story) — Jira status: In Project Team Review ⚠️
   ```
   Do NOT add the status suffix for stories that are "Done". The user can choose to exclude the story via the Section question.

   Then ask questions using AskUserQuestion (Section and Title are TWO SEPARATE CALLS so Title is skipped if Exclude):

   **Section question:**
   - Question: "Which section for this item?"
   - Options: Features / Bug Fixes / Under the Hood / Exclude
   - Add "(Recommended)" to Features for Stories, Bug Fixes for Bugs
   - If user types in "Other", interpret as an instruction (e.g., "go back to previous item") and handle accordingly

   **If Section is NOT Exclude - ask Title question:**
   - Question: "Which title? (See table above, or type your preferred title in 'Other')"
   - Options: AI suggestion / Jira / PR (no "Custom" - user types preferred title in built-in "Other")
   - If user types in "Other", use their text as the title
   - **Title option order must ALWAYS be:** AI suggestion, Jira, PR (both in table and in question options)
   - Stories included in release notes will have their Fix Version updated automatically (tracked for step 9)

   **If Section IS Exclude - ask Fix Version question:**
   - Question: "Should this story's Fix Version be set to this release?"
   - Options: Yes / No
   - Default recommendation: **Yes (Recommended)** - infrastructure improvements may not be user-facing but should still be tracked in Jira
   - If **Yes**: Add to Fix Version update list (step 9) even though excluded from release notes
   - If **No**: Do not update Fix Version (e.g., if the story was fixed in a prior release, or the PR isn't part of this release)

   After selection, confirm:
   > ✓ **CODAP-1027** → Features: "Selected title here"

6. **For PRs without Jira IDs:**
   - Show PR title only
   - Default recommendation: **Exclude (Recommended)** for docs, dependencies, maintenance
   - Option to include in Under the Hood if relevant
   - No Fix Version to update (no Jira story)

7. **Generate CHANGELOG markdown** after all items are processed:

   ```markdown
   ## Version {version} - Month Day, Year

   ### ✨ Features & Improvements:
   - **CODAP-XXX:** Title here
   - **CODAP-YYY:** Another title

   ### 🐞 Bug Fixes:
   - **CODAP-AAA:** Fix description
   - **CODAP-BBB:** Another fix

   ### 🛠️ Under the Hood:
   - **CODAP-ZZZ:** Internal improvement
   ```

   **Rules:**
   - Order items by **numeric** Jira ID (223 before 1027)
   - Only include sections that have items
   - Use the release date from Phase 1
   - Date format: `Month Day, Year` (e.g., `February 1, 2026`)

8. **Present generated markdown for approval:**

   Show the complete CHANGELOG entry, then ask:
   - **Approve** - Release notes are ready, proceed to Phase 3
   - **Edit an item** - Go back and change a specific item's section or title
   - **Reorder items** - Change the order within sections

   Note: Mention that Asset Sizes will be added in Phase 4 after the build.

9. **Update Jira Fix Versions** for all stories where user approved the update (during step 5).

    **IMPORTANT - Context Management:** Jira MCP responses can be verbose and consume significant context. Delegate this bulk operation to a subagent:

    > Use the Task tool to update Fix Versions for all approved stories. Provide the subagent with:
    > - The list of CODAP-XXX story IDs to update
    > - The version string to set (e.g., `3.0.5`)
    >
    > The subagent should report back ONLY:
    > - Success/failure count (e.g., "Updated 8/10 stories successfully")
    > - IDs of any stories that failed (e.g., "Failed: CODAP-123, CODAP-456")

## Phase 3: Update Version Files

**Goal:** Sync translations, update all version-related files, and create release branch.

**IMPORTANT — Working Directory Awareness:**
- Scripts in `v3/scripts/` use `cd v3` internally, which changes the shell's working directory for subsequent commands in the same Bash call.
- After running a v3 script, always verify your working directory with `pwd` before running git commands.
- **All `git` commands must be run from the repository root** (`/path/to/codap`), not from `v3/`.
- If a `git diff` or `git status` command produces **no output**, do NOT assume "no changes" — verify by checking the working directory and trying again with correct paths. Empty output from git commands that should show changes is a red flag that something is wrong.

### Steps

**IMPORTANT — Branch policy:** Never commit directly to `main`. The release
branch must be created before any commits (translations, version files, etc.).

1. **Create release branch:**
   ```bash
   git checkout -b release-{version}
   ```

   **Branch naming rules:**
   - Pattern: `release-{version}` where `{version}` is from Phase 1 (e.g., `release-3.0.5`)
   - Do NOT use `/` in branch names
   - Do NOT invent your own pattern

2. **Sync translations with POEditor:**

   V3 owns all string pushes to POEditor — both `DG.*` and `V3.*` keys.
   All English strings live in a single file: `src/utilities/translation/lang/en-US.json5`.

   **API Token:** All scripts resolve the token in order: `-a` argument >
   `~/.porc` > `$POEDITOR_API_TOKEN` env var. Only ask the user for a token
   if none of these are configured.

   **2a. Preview English string changes before pushing:**

   Before pushing, pull the current English strings from POEditor and diff them
   against the local `en-US.json5` so the user can validate the changes.

   ```bash
   cd v3
   # Pull current English strings from POEditor to a temp file
   ./scripts/strings-pull.sh -p 125447 -l en-US -o /tmp
   # Convert local JSON5 to JSON for comparison
   node -e "
   const fs = require('fs');
   const JSON5 = require('json5');
   const data = JSON5.parse(fs.readFileSync('src/utilities/translation/lang/en-US.json5', 'utf8'));
   fs.writeFileSync('/tmp/en-US-local.json', JSON.stringify(data, null, 4) + '\n');
   "
   # Detailed diff showing new keys, changed values, and keys only in POEditor
   node -e "
   const poeditor = require('/tmp/en-US.json');
   const local = require('/tmp/en-US-local.json');
   const changed = [], newKeys = [], missingLocally = [];
   for (const k of Object.keys(local)) {
     if (!(k in poeditor)) newKeys.push(k);
     else if (poeditor[k] !== local[k]) changed.push({key: k, old: poeditor[k], new: local[k]});
   }
   for (const k of Object.keys(poeditor)) {
     if (!(k in local)) missingLocally.push(k);
   }
   console.log('=== VALUE CHANGES (' + changed.length + ' keys) ===');
   changed.forEach(c => {
     console.log('  ' + c.key);
     console.log('    POEditor: ' + JSON.stringify(c.old));
     console.log('    Local:    ' + JSON.stringify(c.new));
     console.log();
   });
   console.log('=== NEW KEYS (' + newKeys.length + ' keys) ===');
   newKeys.forEach(k => console.log('  ' + k + ': ' + JSON.stringify(local[k])));
   console.log();
   console.log('=== KEYS IN POEDITOR BUT NOT LOCAL (' + missingLocally.length + ' keys) ===');
   missingLocally.forEach(k => console.log('  ' + k + ': ' + JSON.stringify(poeditor[k])));
   "
   ```

   Show the diff to the user. Common expected changes:
   - New keys added since the last release (lines only in local)
   - Updated string values

   **Red flags to call out:**
   - Keys present in POEditor but missing locally (would NOT be deleted since
     `sync_terms=0`, but worth noting)
   - Unexpected value changes to existing keys

   **Decide whether to push — based solely on whether English strings changed:**
   - **No value changes AND no new keys** (English strings unchanged): **skip the
     push entirely — do not ask.** There is nothing to upload, so the push (2b)
     would be a no-op. Note that English is unchanged and go straight to the
     mandatory pull (2c).
   - **There ARE English string changes** (new keys or changed values): show the
     diff and ask the user to approve the push before proceeding to 2b.

   **2b. Push English strings to POEditor** (only when 2a found English changes):
   ```bash
   ./scripts/strings-push-project.sh
   ```
   This pushes all strings from `en-US.json5` (both DG and V3 keys) to POEditor.
   The push is additive (`sync_terms=0`) — it adds new terms and updates existing
   values but never deletes terms. Push first so that the subsequent pull includes
   any new keys added since the last release.

   **2c. Pull non-English translations:**
   ```bash
   ./scripts/strings-pull-project.sh
   ```
   This pulls translated strings for all supported languages. Report results to the
   user (the streaming output may be collapsed in the UI).

   **Always run the pull — never skip it and never ask whether to pull.** Every
   build must pull from POEditor, because translators may have added or updated
   non-English strings since the last release even when the English strings are
   unchanged. (The push in 2b is conditional; this pull is not.)

   **2d. Verify and commit pulled translations:**

   Return to the repository root before running git commands:
   ```bash
   cd /path/to/codap   # repository root, NOT v3/
   git status -- v3/src/utilities/translation/lang/
   ```
   Report results to the user. If there are changes:
   ```bash
   git add v3/src/utilities/translation/lang/
   git commit -m "Update translations from POEditor"
   ```

   **Zero-width space handling:** POEditor treats truly empty strings as
   "untranslated," so the scripts convert between empty strings and zero-width
   spaces (`\u200b`) at the boundary:
   - **Push** (`strings-push.sh`): `""` → `"\u200b"` before uploading
   - **Pull** (`strings-pull.sh`): `"\u200b"` → `""` after downloading

   The source file (`en-US.json5`) and all runtime language files use `""` for
   intentionally blank strings — zero-width spaces should never appear in the
   repository.

3. **Update package.json version:**
   ```bash
   cd v3
   npm version --no-git-tag-version {version}
   ```

   **IMPORTANT:** Use the `npm version` command - do NOT manually edit package.json. The npm command updates both package.json AND package-lock.json.

4. **Update versions.md:**

   Add new row at top of versions table (using release date from Phase 1):
   ```markdown
   | [{version}](https://codap3.concord.org/version/{version}/) | Month Day, Year |
   ```

5. **Update CHANGELOG.md:**
   - Insert content from Phase 2 at top (after `# Changelog` heading)
   - Asset Sizes section added in Phase 4

6. **Stage version files:**
   ```bash
   git add v3/package.json v3/package-lock.json v3/versions.md v3/CHANGELOG.md
   ```

## Phase 4: Create Release PR

**Goal:** Build, capture asset sizes, commit, and create PR.

### Steps

1. **Run build:**
   ```bash
   cd v3 && npm run build
   ```

2. **Get asset sizes:**
   ```bash
   ls -la v3/dist/assets
   ```

   - Find `main.*.css` file, get its size
   - Find all `index.*.js` files, use the **largest** one
   - Strip hashes for display: `index.f6eac39a783c91ae9ea5.js` → `index.js`

3. **Calculate % change:**
   - Read previous sizes from top entry in CHANGELOG.md
   - Calculate: `((new - old) / old) * 100`
   - Format: `X.XX%`, `<0.01%` for very small increases, negative for decreases (e.g., `-0.50%`)

4. **Add Asset Sizes to CHANGELOG:**
   ```markdown
   ### Asset Sizes
   |      File |          Size | % Change from Previous Release |
   |-----------|---------------|--------------------------------|
   |  main.css |  XXXXXX bytes |                          X.XX% |
   |  index.js | XXXXXXX bytes |                          X.XX% |
   ```

5. **Commit and push:**
   ```bash
   git add v3/CHANGELOG.md
   git commit -m "Release {version}"
   git push -u origin release-{version}
   ```

   **Note:** Only commit the version files (package.json, package-lock.json, versions.md, CHANGELOG.md). Do not commit the `dist/` build output.

6. **Create PR with labels:**
   ```bash
   gh pr create \
     --title "Release {version}" \
     --body "{release_notes_from_phase_2}" \
     --label "v3" \
     --label "run regression"
   ```

7. **Inform user:**
   > **PR created:** {url}
   >
   > CI is running. The `run regression` label triggers the full Cypress test suite.
   >
   > After CI passes and PR is reviewed/merged, run `/codap-v3-build tag` to continue.

## Phase 5: Tag

**Goal:** After PR merge, create the git tag that triggers the S3 build.

> **Do NOT create the GitHub release here.** Publishing the GitHub release at tag
> time confused external users: they saw a published release for a version that
> was not yet available in production (staging QA can take 1+ days). The GitHub
> release is created later, in Phase 6, only **after** the build is live in
> production. The tag still must be pushed now, because the tag push is what
> triggers the CI build that deploys to S3 (needed for staging).

**Prerequisite:** Release PR must be merged, **and** the automatic "Increment the
build number" commit that follows the merge must have landed on `main` (see step 2).

### Steps

1. **Checkout main and pull:**
   ```bash
   git checkout main
   git pull
   ```

2. **Verify the build-number increment commit has landed — do NOT skip this:**

   Merging the release PR triggers an automation that pushes an
   "Increment the build number" commit to `main`. **That increment commit is the one
   to tag** — not the `Release {version}` merge commit.

   ```bash
   git log --oneline -2
   ```

   The output must show the increment commit sitting on top of the release merge:
   ```
   f999f1445 Increment the build number     <- tag THIS one (HEAD)
   936451ef5 Release {version} (#NNNN)
   ```

   If `HEAD` is still the `Release {version}` merge commit, the automation has not
   pushed yet. **Wait, re-run `git pull`, and check again** until the increment
   commit appears.

   > **Why this matters:** tagging immediately after the merge, before the increment
   > lands, points the tag at the release merge commit instead. This has happened
   > before. The resulting build carries the wrong build number, and undoing it means
   > deleting the tag and its S3 deploy. Every correct release tag (3.0.0 through
   > 3.0.3) points at an "Increment the build number" commit — use that as your check.

3. **Create and push annotated tag:**
   ```bash
   git tag -a {version} -m "Version {version}"
   git push origin {version}
   ```

   Confirm the tag landed on the increment commit before moving on:
   ```bash
   git log -1 --format='%h %s' {version}
   # expected: <sha> Increment the build number
   ```

   The tag push triggers a CI build that deploys to S3. The GitHub release is
   **not** created until after the production deploy (Phase 6).

4. **Inform user and wait for S3 deploy:**
   > **Tag pushed.** (The GitHub release will be created later, after the production deploy, so external users don't see a release for a version that isn't live yet.)
   >
   > Watch GitHub Actions: https://github.com/concord-consortium/codap/actions
   >
   > The tag push triggers a CI build that deploys to S3. **Do not trigger the staging workflow until this deploy completes.** Once the S3 deploy is done, the version will be available at:
   > https://codap3.concord.org/version/{version}/
   >
   > Let me know when the deploy is complete and you're ready to proceed with staging, or run `/codap-v3-build deploy {version}` to continue.

   **IMPORTANT:** Do NOT automatically trigger the staging workflow here. The staging workflow copies the build from S3, so it will fail if the tag's CI deploy hasn't finished yet. Wait for the user to confirm the deploy is complete.

## Phase 6: Deploy

**Goal:** Stage, test, deploy to production and beta, publish the GitHub release, finalize Jira.

### Steps

1. **Trigger staging workflow:**
   ```bash
   gh workflow run release-v3-staging.yml -f version={version}
   ```

   > **Staging workflow triggered.**
   >
   > Watch: https://github.com/concord-consortium/codap/actions/workflows/release-v3-staging.yml
   >
   > Test at: https://codap3.concord.org/index-staging.html

2. **Post release announcement to Slack:**

   Post to the `#codap-v3` channel in the Concord Consortium workspace (`concord-consortium.slack.com`).

   **CRITICAL — every item MUST start with `- ` (hyphen + space).** Slack's
   markdown renderer collapses consecutive non-list lines into a single
   paragraph (joining `**CODAP-XXX:**` prefixes mid-sentence). Bullet lists
   are rendered as discrete items, so the `- ` prefix is non-negotiable —
   even when a section has only one item. Do NOT skip it because it "looks
   redundant" with one item; the next release may add more, and the format
   must be uniform.

   **If Slack MCP server is available:**
   - Ask user for permission to post
   - Post the announcement using `mcp__slack__conversations_add_message`
   - Use `content_type: text/markdown` and `channel_id: #codap-v3`

   **If Slack MCP server is NOT available:**
   - Show the user a draft of the announcement
   - Instruct them to paste it into Slack manually

   **Announcement format (standard markdown — same syntax as CHANGELOG):**

   ```markdown
   CODAP {version} is available for testing at https://codap3.concord.org/staging.

   ### ✨ Features & Improvements:
   - **CODAP-XXX:** Feature title here
   - **CODAP-YYY:** Another feature

   ### 🐞 Bug Fixes:
   - **CODAP-AAA:** Bug fix title
   - **CODAP-BBB:** Another fix

   ### 🛠️ Under the Hood:
   - **CODAP-ZZZ:** Internal change

   The [beta](https://codap3.concord.org/beta) and [production](https://codap3.concord.org/) URLs will be updated once the staging build passes QA.
   ```

   **Rules:**
   - Use the version number from this release (e.g., `3.0.5`)
   - Include only the sections that have items (Features, Bug Fixes, Under the Hood)
   - Use the same titles and order as in CHANGELOG.md (including emoji prefixes in section headers)
   - Each item on its own line, prefixed with `- **CODAP-XXX:**` — every section, every item, no exceptions
   - End with the beta/production follow-up message (links should render in Slack)

   **Self-check before posting** — count `\n- ` in your message body. The
   count must equal the total number of items across all sections. If it
   doesn't, you forgot the `- ` prefix on at least one item; fix it before
   calling the tool. Show the exact text you will post to the user for
   approval before calling `mcp__slack__conversations_add_message`.

3. **Wait for external QA** (may take 1+ days)

   > **Let me know when staging QA is complete** and we can proceed with production deployment.
   >
   > If you'd prefer to complete deployment separately, see manual instructions below.

4. **After QA approval:** deploy to production and beta, **then publish the GitHub
   release** (now that the build is live in production), and finalize Jira. See the
   Manual Completion Instructions below for the exact commands, and run them in that
   order — the GitHub release should not be published until the production deploy
   has succeeded.

### Manual Completion Instructions

If you prefer to complete deployment outside of Claude Code:

**Deploy to production:**
```bash
gh workflow run release-v3-production.yml -f version={version}
```
Or use GitHub UI: https://github.com/concord-consortium/codap/actions/workflows/release-v3-production.yml

**Deploy to beta:**
```bash
gh workflow run release-v3-beta.yml -f version={version}
```
Or use GitHub UI: https://github.com/concord-consortium/codap/actions/workflows/release-v3-beta.yml

**Publish the GitHub release** (only after the production deploy has succeeded):
```bash
gh release create {version} \
  --title "Version {version}" \
  --notes "{release_notes_from_phase_2}"
```
Creating the GitHub release now — rather than at tag time (Phase 5) — ensures
external users only see a published release once the version is actually available
in production.

**Finalize Jira release:**
1. Go to CODAPv3 project in Jira
2. Open "Manage Releases" tab
3. Find release `{version}`
4. Mark as `Released`

### Resume Later

To complete deployment in Claude Code after QA:
```
/codap-v3-build deploy {version}
```

## Staging QA Failure — Revised Release

**Trigger:** A show-stopper bug is found during Phase 6 staging QA, and a fix has been merged to `main`.

**Invocation:** `/codap-v3-build fix {old-version}` (e.g., `/codap-v3-build fix 3.0.5`)

When invoked, introduce the situation:

> A bug was found during staging QA for **{old-version}** and a fix has been merged.
> This workflow will create a revised release with an updated version number.
>
> I'll walk you through:
> 1. Determine the new version number and release date
> 2. Decide whether release notes need updating
> 3. Update version files
> 4. Build and create a new release PR
> 5. Clean up the old tag/release and create new ones
> 6. Update Jira and re-deploy to staging

### Step 1: Gather Context

1. **Ensure on main with latest:**
   ```bash
   git checkout main
   git pull
   ```

2. **Get current build number and verify the fix is present:**
   ```bash
   cat v3/build_number.json
   git log --oneline {old-version}..HEAD
   ```

   Confirm with the user that the expected fix commit(s) appear in the log.

3. **Determine the new version number — this is phase-dependent** (see Phase 1, step 6,
   for how to identify the phase):

   | Phase | Revised release version |
   |-------|-------------------------|
   | **Production release** | **The version does not change.** `{old-version}` is reused as-is. Only the build number changes (it increments when the revised release PR merges), and the build number is not part of the version. The respin is reflected in the CHANGELOG, not the version string. |
   | **Pre-release development** | The version **does** change, because the build number is part of it. Current build number is N; the release PR increments it once more on merge → new version is **N + 1**, matching `{old-version}`'s prefix. Example: build `2804` → `3.0.0-beta.2805`. |

   > **The production-phase rule reshapes this whole workflow.** With the version
   > unchanged there is no "old vs new version" to reconcile: `versions.md` needs no
   > edit, the Jira release needs no rename, and `npm version` is a no-op. What still
   > must happen is re-tagging — delete the `{version}` tag and recreate it on the new
   > increment commit (Step 5) — plus any CHANGELOG corrections and a fresh staging
   > deploy. Read the steps below with that in mind and skip the version-migration
   > parts; they apply only in the pre-release phase.
   >
   > This production-phase path has **not yet been exercised** as of 3.0.5. Confirm the
   > approach with the user before running it rather than assuming these notes are
   > complete.

4. **Confirm release date:**
   - The original release date (from Phase 1) may no longer be appropriate if QA and the fix took multiple days.
   - Show the original release date and today's date.
   - Ask the user to confirm or update the release date.
   - This date will be used in CHANGELOG.md, versions.md, and the Jira release.

5. **Confirm with user:**
   > The fix is on main. New version will be **{new-version}** (old was {old-version}).
   > Release date: **{release-date}**
   >
   > Does this look correct?

### Step 2: Release Notes Decision

Ask the user:

> Do the release notes need to be updated?
>
> - **No changes needed** — The bug was introduced in this release cycle, so users never saw it
> - **Add the fix** — The bug existed in a prior release and the fix should be documented

**If no changes needed:**
- The existing CHANGELOG content will be reused with only the version number and date updated in the header.

**If release notes need updating:**
- Walk through the new fix item(s) using the same interactive process as Phase 2, step 5 (present title options, ask for section and title).
- Insert the new item(s) into the appropriate section(s) of the existing release notes, maintaining numeric Jira ID order.
- Present the updated CHANGELOG entry for approval.
- Update Jira Fix Versions for any newly added stories.

### Step 3: Create Release Branch and Update Files

Follow the same working directory rules as Phase 3.

1. **Create release branch:**
   ```bash
   git checkout -b release-{new-version}
   ```

2. **Sync translations:**
   - **Always pull** translations from POEditor (Phase 3, step 2c) — every build
     must pull, since translators may have added or updated non-English strings
     even when the English strings are unchanged. Do not skip this.
   - **Only push** English strings (Phase 3, steps 2a–2b) if the bug fix introduced
     new or changed translatable strings. For most bug fixes there are none, so the
     push is skipped — but the pull still runs.

3. **Update package.json:**
   ```bash
   cd v3
   npm version --no-git-tag-version {new-version}
   ```

4. **Update versions.md:**
   - **Replace** the `{old-version}` row with the `{new-version}` row (using the confirmed release date)
   - Do NOT add a second row — this is a revision, not a separate release

5. **Update CHANGELOG.md:**
   - **Replace** the `## Version {old-version}` header with `## Version {new-version}`, using the confirmed release date
   - If release notes content changed (Step 2), update the content as well
   - The Asset Sizes section will be updated after the build (Step 4)

6. **Commit version file changes:**
   ```bash
   cd /path/to/codap
   git add v3/package.json v3/package-lock.json v3/versions.md v3/CHANGELOG.md
   git commit -m "Release {new-version}"
   ```

### Step 4: Build, Asset Sizes, and Release PR

Follow the same process as Phase 4:

1. **Build:**
   ```bash
   cd v3 && npm run build
   ```

2. **Update asset sizes** in CHANGELOG.md (same process as Phase 4, steps 2–4).
   - Compare against the **previous release before {old-version}** for % change (since `{old-version}` is being replaced, not used as baseline).

3. **Commit, push, and create PR:**
   ```bash
   cd /path/to/codap
   git add v3/CHANGELOG.md
   git commit --amend --no-edit
   git push -u origin release-{new-version}
   gh pr create \
     --title "Release {new-version}" \
     --body "{release_notes}" \
     --label "v3" \
     --label "run regression"
   ```

4. **Inform user:**
   > **PR created:** {url}
   >
   > After CI passes and PR is merged, I'll clean up the old release and create the new one.

### Step 5: After PR Merge — Clean Up and Re-tag

**Prerequisite:** Release PR must be merged, **and** the automatic "Increment the
build number" commit that follows the merge must have landed on `main`.

1. **Checkout main, pull, and wait for the increment commit:**
   ```bash
   git checkout main
   git pull
   git log --oneline -2
   ```

   As in Phase 5, the new tag must point at the **"Increment the build number"**
   commit that the merge automation pushes after the release merge — not at the
   `Release {new-version}` merge commit itself. If `HEAD` is still the release merge,
   wait, `git pull` again, and re-check until the increment commit appears.

2. **Delete the old tag:**
   ```bash
   git push origin --delete {old-version}
   git tag -d {old-version}
   ```

   The tag is safe to delete because it points to a known-buggy build that was
   never deployed to production or beta and that no external consumer depends on.

   **No GitHub release to delete:** under the current flow the GitHub release is
   only created after a production deploy (Phase 6). Since `{old-version}` failed
   staging QA, it never reached production and never had a release published. (If
   one somehow exists, remove it with `gh release delete {old-version} --yes`.)

3. **Create the new tag:**
   ```bash
   git tag -a {new-version} -m "Version {new-version}"
   git push origin {new-version}
   git log -1 --format='%h %s' {new-version}
   # expected: <sha> Increment the build number
   ```

   As in Phase 5, do **not** create the GitHub release here. The tag push triggers
   the S3 build; the GitHub release for `{new-version}` is published only after the
   revised build reaches production (Step 6 / the deploy phase).

4. **Delete old release branch** (optional cleanup):
   ```bash
   git push origin --delete release-{old-version}
   git branch -d release-{old-version}
   ```

5. **Inform user and wait for S3 deploy:**
   > **Old tag cleaned up. New tag created.** (The GitHub release will be created later, after the revised build reaches production.)
   >
   > Watch GitHub Actions: https://github.com/concord-consortium/codap/actions
   >
   > The tag push triggers a CI build that deploys to S3. **Do not trigger the staging workflow until this deploy completes.** Once the S3 deploy is done, the version will be available at:
   > https://codap3.concord.org/version/{new-version}/
   >
   > Let me know when the deploy is complete and we can proceed with Jira updates and staging.

   **IMPORTANT:** Do NOT automatically trigger the staging workflow here. The staging workflow copies the build from S3, so it will fail if the tag's CI deploy hasn't finished yet. Wait for the user to confirm the deploy is complete.

### Step 6: Update Jira and Re-deploy

1. **Update Jira release version:**
   - Rename the Jira release from `{old-version}` to `{new-version}`
   - Update the release date if it changed
   - If new stories were added to release notes (Step 2), update their Fix Versions

   **Context management:** Delegate Jira updates to a subagent (same pattern as Phase 2, step 9).

2. **Re-deploy to staging:**
   ```bash
   gh workflow run release-v3-staging.yml -f version={new-version}
   ```

3. **Post updated Slack announcement** (same format as Phase 6, step 2 — every item must use the `- **CODAP-XXX:**` bullet prefix). Note this is a revised build:

   ```markdown
   CODAP {new-version} is available for testing at https://codap3.concord.org/staging.
   (Revised build — replaces {old-version} which had a staging QA issue.)

   ### ✨ Features & Improvements:
   - **CODAP-XXX:** Feature title here

   ### 🐞 Bug Fixes:
   - **CODAP-AAA:** Bug fix title
   - **CODAP-BBB:** Another fix

   ### 🛠️ Under the Hood:
   - **CODAP-ZZZ:** Internal change

   The [beta](https://codap3.concord.org/beta) and [production](https://codap3.concord.org/) URLs will be updated once the staging build passes QA.
   ```

4. **Inform user:**
   > **Revised release {new-version} deployed to staging.**
   >
   > Test at: https://codap3.concord.org/index-staging.html
   >
   > When staging QA passes, run `/codap-v3-build deploy {new-version}` to continue with production deployment.

## File Locations

| File | Purpose |
|------|---------|
| `v3/build_number.json` | Current build number. Part of the version string **only** in the pre-release phase (Phase 1, step 6). In the production phase it is independent of the version, but its auto-increment commit is always the tag target (Phase 5). |
| `v3/package.json` | Version field |
| `v3/versions.md` | Version history table |
| `v3/CHANGELOG.md` | Release notes |
| `v3/dist/assets/` | Built assets (after `npm run build`) |
| `v3/src/utilities/translation/lang/en-US.json5` | All English strings (DG + V3, JSON5, source of truth) |

## Jira Integration

Use these constants for all Atlassian MCP tool calls:

| Constant | Value |
|----------|-------|
| `cloudId` | `concord-consortium.atlassian.net` |
| `projectKey` | `CODAP` |

> **Note:** The Atlassian MCP tools accept either a UUID cloud ID or a site URL for the `cloudId` parameter. The site URL format is used here for readability.

- Use Atlassian MCP tools for all Jira operations
- Stories tagged via `Fix versions` field
- Release marked `Released` after production deploy
