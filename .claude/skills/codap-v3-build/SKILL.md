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
   | Version name | `3.0.0-beta.<buildNumber+1>` (Recommended) | Also offer `-rc` and non-prerelease variants |
   | Start date | Previous release date | User can modify |
   | Release date | Today's date | Today / Tomorrow / Custom future date |
   | Description | `Version 3.0.0-beta.<buildNumber+1>` | User can modify |

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
   git log <last-tag>..HEAD --oneline --merges
   ```

2. **Get PR details from GitHub:**
   ```bash
   gh pr view <number> --json number,title,headRefName
   ```

3. **Get Jira stories with status "Done" since previous release date**

4. **Match PRs to Jira stories by CODAP-XXX ID:**
   - Check branch name first (most reliable, e.g., `CODAP-1027-inbounds-url-param`)
   - Then PR title (e.g., `CODAP-1027: Implement inbounds parameter`)
   - Use caution with PR descriptions - they may reference related stories (e.g., "Follow-up to CODAP-XXX") that aren't the primary story for this PR
   - Extract unique CODAP-XXX IDs

5. **For each matched item, fetch:**
   - Jira story details (summary, issue type)
   - PR title from GitHub
   - Generate AI-suggested title (concise, user-focused)

6. **Interactive walkthrough for each item:**

   Present item number and Jira ID:
   > **Item 1/8: CODAP-1027** (Story)

   Show title options in table:
   | Source | Title |
   |--------|-------|
   | **Jira** | {jira_summary} |
   | **PR** | {pr_title} |
   | **AI suggestion** | {ai_title} |

   Ask user:
   - **Section:** Features (Recommended) / Bug Fixes / Under the Hood / Exclude
     - Add "(Recommended)" to Features for Stories, Bug Fixes for Bugs

   If **not excluded**:
   - **Title:** AI suggestion / Jira / PR / Custom
   - Fix Version will be updated automatically

   If **excluded**:
   - Ask: **Update Fix Version anyway?** Yes / No
     - Some stories marked "Done" may have been fixed in a prior release

   After selection, confirm:
   > ✓ **CODAP-1027** → Features: "Selected title here"

7. **For PRs without Jira IDs:**
   - Show PR title only
   - Default recommendation: **Exclude (Recommended)** for docs, dependencies, maintenance
   - Option to include in Under the Hood if relevant
   - No Fix Version to update (no Jira story)

8. **Generate CHANGELOG markdown** after all items are processed:

   ```markdown
   ## Version 3.0.0-beta.XXXX - Month Day, Year

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

9. **Present generated markdown for approval:**

   Show the complete CHANGELOG entry, then ask:
   - **Approve** - Release notes are ready, proceed to Phase 3
   - **Edit an item** - Go back and change a specific item's section or title
   - **Reorder items** - Change the order within sections

   Note: Mention that Asset Sizes will be added in Phase 4 after the build.

10. **Update Jira Fix Versions** for all stories where user approved the update (during step 6).

## Phase 3: Update Version Files

**Goal:** Update all version-related files and create release branch.

### Steps

1. **Update package.json version:**
   ```bash
   cd v3
   npm version --no-git-tag-version 3.0.0-beta.XXXX
   ```

2. **Update versions.md:**

   Add new row at top of versions table (using release date from Phase 1):
   ```markdown
   | [3.0.0-beta.XXXX](https://codap3.concord.org/version/3.0.0-beta.XXXX/) | Month Day, Year |
   ```

3. **Update CHANGELOG.md:**
   - Insert content from Phase 2 at top (after `# Changelog` heading)
   - Asset Sizes section added in Phase 4

4. **Create release branch:**
   ```bash
   git checkout -b v3-release-XXXX
   ```

5. **Stage files:**
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
   git commit -m "Release 3.0.0-beta.XXXX"
   git push -u origin v3-release-XXXX
   ```

   **Note:** Only commit the version files (package.json, package-lock.json, versions.md, CHANGELOG.md). Do not commit the `dist/` build output.

6. **Create PR with labels:**
   ```bash
   gh pr create \
     --title "Release 3.0.0-beta.XXXX" \
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
   git tag -a 3.0.0-beta.XXXX -m "Version 3.0.0-beta.XXXX"
   git push origin 3.0.0-beta.XXXX
   ```

3. **Create GitHub release:**
   ```bash
   gh release create 3.0.0-beta.XXXX \
     --title "3.0.0-beta.XXXX" \
     --notes "{release_notes_from_phase_2}"
   ```

4. **Inform user:**
   > **Tag pushed and GitHub release created.**
   >
   > Watch GitHub Actions: https://github.com/concord-consortium/codap/actions
   >
   > Once S3 Deploy completes, QA at:
   > https://codap3.concord.org/version/3.0.0-beta.XXXX/
   >
   > After QA passes, run `/codap-v3-build deploy` to continue.

## Phase 6: Deploy

**Goal:** Stage, test, deploy to production and beta, finalize Jira.

### Steps

1. **Trigger staging workflow:**
   ```bash
   gh workflow run release-v3-staging.yml -f version=3.0.0-beta.XXXX
   ```

   > **Staging workflow triggered.**
   >
   > Watch: https://github.com/concord-consortium/codap/actions/workflows/release-v3-staging.yml
   >
   > Test at: https://codap3.concord.org/index-staging.html

2. **Wait for external QA** (may take 1+ days)

   > **Let me know when staging QA is complete** and we can proceed with production deployment.
   >
   > If you'd prefer to complete deployment separately, see manual instructions below.

3. **After QA approval, deploy to production and beta, then finalize Jira.**

### Manual Completion Instructions

If you prefer to complete deployment outside of Claude Code:

**Deploy to production:**
```bash
gh workflow run release-v3-production.yml -f version=3.0.0-beta.XXXX
```
Or use GitHub UI: https://github.com/concord-consortium/codap/actions/workflows/release-v3-production.yml

**Deploy to beta:**
```bash
gh workflow run release-v3-beta.yml -f version=3.0.0-beta.XXXX
```
Or use GitHub UI: https://github.com/concord-consortium/codap/actions/workflows/release-v3-beta.yml

**Finalize Jira release:**
1. Go to CODAPv3 project in Jira
2. Open "Manage Releases" tab
3. Find release `3.0.0-beta.XXXX`
4. Mark as `Released`

### Resume Later

To complete deployment in Claude Code after QA:
```
/codap-v3-build deploy 3.0.0-beta.XXXX
```

## File Locations

| File | Purpose |
|------|---------|
| `v3/build_number.json` | Current build number |
| `v3/package.json` | Version field |
| `v3/versions.md` | Version history table |
| `v3/CHANGELOG.md` | Release notes |
| `v3/dist/assets/` | Built assets (after `npm run build`) |

## Jira Integration

- Project: CODAP at `concord-consortium.atlassian.net`
- Use Atlassian MCP tools for all Jira operations
- Stories tagged via `Fix versions` field
- Release marked `Released` after production deploy
