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
| 5 | `/codap-v3-build tag` | Tag and create GitHub release |
| 6 | `/codap-v3-build deploy [version]` | Deploy to staging/production |
| fix | `/codap-v3-build fix {old-version}` | Revise release after staging QA failure |

## Getting Started

When invoked, introduce the skill:

> This skill will walk you through the process of building a release of CODAP v3. The process has 6 phases:
>
> 1. **Prepare the Release** - Set up Jira version and gather context
> 2. **Prepare Release Notes** - Interactive walkthrough to create CHANGELOG entry
> 3. **Update Version Files** - Update package.json, versions.md, CHANGELOG.md
> 4. **Create Release PR** - Build, capture asset sizes, create PR
> 5. **Tag and Release** - After PR merge, create git tag and GitHub release
> 6. **Deploy** - Stage, QA, deploy to production
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

4. **Get previous release tag:**
   ```bash
   git tag --sort=-creatordate | head -5
   ```

5. **Show context to user:**
   - Display last 3 releases (version and date)
   - Show current build number from `build_number.json`

6. **Determine recommended version string:**
   - Use build number **+ 1** (build number auto-increments when release PR merges)
   - Match previous release pattern (e.g., `-beta`, `-pre`)
   - Example: If build number is `2662`, recommend `3.0.0-beta.2663`

7. **Get previous release date from Jira** (for start date default)

8. **Ask user for Jira release details:**

   | Field | Default | Options |
   |-------|---------|---------|
   | Version name | Based on previous release pattern + new build number | Match previous pattern (e.g., `-beta`, `-rc`, or release) |
   | Start date | Previous release date | User can modify |
   | Release date | Today's date | Today / Tomorrow / Custom future date |
   | Description | `Version {version}` | User can modify |

   **Note:** The release date chosen here is used throughout the process:
   - CHANGELOG.md header date
   - versions.md entry date
   - Jira release date

9. **Create Jira release version** using Atlassian MCP tools (status: `Unreleased`)

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
    > - The version string to set (e.g., `3.0.0-beta.2664`)
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
   - Pattern: `release-{version}` where `{version}` is from Phase 1 (e.g., `release-3.0.0-beta.2664`)
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

   Ask the user to approve the push before proceeding. If the diff is empty
   (no changes), note that and ask whether to skip the push.

   **2b. Push English strings to POEditor:**
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

## Phase 5: Tag and Release

**Goal:** After PR merge, create git tag and GitHub release.

**Prerequisite:** Release PR must be merged.

### Steps

1. **Checkout main and pull:**
   ```bash
   git checkout main
   git pull
   ```

2. **Create and push annotated tag:**
   ```bash
   git tag -a {version} -m "Version {version}"
   git push origin {version}
   ```

3. **Create GitHub release:**
   ```bash
   gh release create {version} \
     --title "Version {version}" \
     --notes "{release_notes_from_phase_2}"
   ```

4. **Inform user:**
   > **Tag pushed and GitHub release created.**
   >
   > Watch GitHub Actions: https://github.com/concord-consortium/codap/actions
   >
   > Once S3 Deploy completes, QA at:
   > https://codap3.concord.org/version/{version}/
   >
   > After QA passes, run `/codap-v3-build deploy` to continue.

## Phase 6: Deploy

**Goal:** Stage, test, deploy to production and beta, finalize Jira.

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

   **If Slack MCP server is available:**
   - Ask user for permission to post
   - Post the announcement using `mcp__slack__conversations_add_message`
   - Use `channel_id: #codap-v3` and `content_type: text/markdown`

   **If Slack MCP server is NOT available:**
   - Show the user a draft of the announcement
   - Instruct them to paste it into Slack manually

   **Announcement format:**

   ```markdown
   CODAP {version} is available for testing at https://codap3.concord.org/staging.

   ### ✨ Features & Improvements:
   **CODAP-XXX:** Feature title here
   **CODAP-YYY:** Another feature

   ### 🐞 Bug Fixes:
   **CODAP-AAA:** Bug fix title
   **CODAP-BBB:** Another fix

   ### 🛠️ Under the Hood:
   **CODAP-ZZZ:** Internal change

   The [beta](https://codap3.concord.org/beta) and [production](https://codap3.concord.org/) URLs will be updated once the staging build passes QA.
   ```

   **Rules:**
   - Use the version number from this release (e.g., `3.0.0-beta.2664`)
   - Include only the sections that have items (Features, Bug Fixes, Under the Hood)
   - Use the same titles and order as in CHANGELOG.md (including emoji prefixes in section headers)
   - Each item on its own line with `**CODAP-XXX:**` prefix
   - End with the beta/production follow-up message (links should render in Slack)

3. **Wait for external QA** (may take 1+ days)

   > **Let me know when staging QA is complete** and we can proceed with production deployment.
   >
   > If you'd prefer to complete deployment separately, see manual instructions below.

4. **After QA approval, deploy to production and beta, then finalize Jira.**

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

**Invocation:** `/codap-v3-build fix {old-version}` (e.g., `/codap-v3-build fix 3.0.0-beta.2803`)

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

3. **Determine new version number:**
   - Current build number is N (from `build_number.json`)
   - The release PR will increment it once more when merged → version is **N + 1**
   - Example: If build number is `2804`, new version is `3.0.0-beta.2805`
   - Match the version pattern of `{old-version}` (same prefix, new build number)

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

2. **Sync translations (only if needed):**
   - Only perform the translation sync (Phase 3, step 2) if the bug fix introduced new or changed translatable strings.
   - For most bug fixes, this can be skipped. Ask the user if unsure.

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

**Prerequisite:** Release PR must be merged.

1. **Checkout main and pull:**
   ```bash
   git checkout main
   git pull
   ```

2. **Delete old GitHub release and tag:**
   ```bash
   gh release delete {old-version} --yes
   git push origin --delete {old-version}
   git tag -d {old-version}
   ```

   These are safe to delete because:
   - The release was never deployed to production or beta
   - The tag points to a known-buggy build
   - No external consumers depend on it

3. **Create new tag and GitHub release:**
   ```bash
   git tag -a {new-version} -m "Version {new-version}"
   git push origin {new-version}
   gh release create {new-version} \
     --title "Version {new-version}" \
     --notes "{release_notes}"
   ```

4. **Delete old release branch** (optional cleanup):
   ```bash
   git push origin --delete release-{old-version}
   git branch -d release-{old-version}
   ```

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

3. **Post updated Slack announcement** (same format as Phase 6, step 2, but note it's a revised build):

   ```markdown
   CODAP {new-version} is available for testing at https://codap3.concord.org/staging.
   (Revised build — replaces {old-version} which had a staging QA issue.)

   {same release notes sections as before}

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
| `v3/build_number.json` | Current build number |
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
