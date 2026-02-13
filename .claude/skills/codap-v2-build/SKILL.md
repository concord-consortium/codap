---
name: codap-v2-build
description: Use when preparing a CODAP v2 release, updating translations, building plugins, incrementing build numbers, or deploying to codap-server. Invoke with phase name to resume.
---

# CODAP v2 Build & Release

## Overview

Interactive workflow for CODAP v2 releases. Guides you through precondition validation, pre-build preparation (translations, plugins, CFM), the automated SproutCore build, server deployment, and QA notification.

The V2 build requires coordinating 7 repositories and deploying via SSH to `codap-server.concord.org`.

## Quick Reference

| Phase | Command | Description |
|-------|---------|-------------|
| 1 | `/codap-v2-build` | Validate preconditions (repos, tools, config) |
| 2 | `/codap-v2-build prep` | Pre-build preparation (CFM, translations, plugins) |
| 3 | `/codap-v2-build build` | Automated build and deploy |
| 4 | `/codap-v2-build post` | Post-build QA notification |

## Getting Started

When invoked, introduce the skill:

> This skill will walk you through the process of building a release of CODAP v2.
>
> Unlike many modern web apps that build from a single repository, a CODAP V2 release assembles code from 7 different repositories: the main codap app, the Cloud File Manager (CFM) for file open/save, standard data analysis plugins, example documents, boundary map data, and several standalone plugins. The build uses SproutCore (a Ruby-based framework) and deploys directly to a server via SSH.
>
> The process has 4 phases:
>
> 1. **Validate Preconditions** - Verify all 7 repositories, required tools, and configuration
> 2. **Pre-Build Preparation** - Update CFM, pull translations from POEditor, update plugin versions
> 3. **Automated Build** - Increment build number, build everything, deploy to server
> 4. **Post-Build** - Notify QA via Slack
>
> Are you ready to proceed?

Wait for user confirmation before starting Phase 1.

## Phase 1: Validate Preconditions

**Goal:** Verify all repositories, tools, and configuration files are in place.

**Gating rule:** Each step must pass before proceeding to the next. If issues are found, offer to resolve them (or ask the user to), then re-verify before moving on.

**Node note:** Each Bash tool call runs in a fresh shell, so environment variables do not persist between commands. Prepend `export NODE_OPTIONS=--openssl-legacy-provider &&` to any command that runs Node. This flag is needed because some older build dependencies (webpack 4, etc.) use legacy OpenSSL APIs removed in Node 17+. Any recent Node version (18+) works.

### Steps

1. **Read build configuration and verify config files:**

   Explain to the user:
   > The CODAP build process is configured via two files in your home directory. `~/.codap-build.rc` defines where the 7 required repositories live and which server to deploy to. `~/.porc` stores the API token for POEditor, the translation management service used for CODAP's 17 supported languages.

   Read `~/.codap-build.rc` to discover configured repository paths, and check that `~/.porc` (POEditor API token) also exists:
   ```bash
   cat ~/.codap-build.rc
   [ -f ~/.porc ] && echo "~/.porc: EXISTS" || echo "~/.porc: MISSING"
   ```

   Expected `.codap-build.rc` variables: `CODAP_HOME`, `CFM_HOME`, `CODAP_DATA_HOME`, `CODAP_DATA_INTERACTIVES_HOME`, `CODAP_SERVER`, `CODAP_SERVER_WWW_BASE`.

   **Note:** The `.codap-build.rc` file may not define paths for all 7 repositories. The build script (`bin/do-full-build-process`) defaults missing paths to sibling directories of `CODAP_HOME`:
   - `CODAP_DATA_HOME` defaults to `../codap-data`
   - `CODAP_DATA_INTERACTIVES_HOME` defaults to `../codap-data-interactives`
   - `CODAP_TRANSFORMERS_HOME` defaults to `../codap-transformers`
   - `STORY_BUILDER_HOME` defaults to `../story-builder`
   - `NOAA_CODAP_PLUGIN_HOME` defaults to `../noaa-codap-plugin`

   Resolve the actual absolute paths for all 7 repositories using the config values and defaults.

2. **Present repository map and ask user to confirm:**

   Show the user a table of all 7 repositories with their **resolved absolute paths** and expected branches, then ask them to verify or correct:

   | Repository | Path | Expected Branch |
   |------------|------|-----------------|
   | codap | `/actual/resolved/path/codap` | `master` |
   | cloud-file-manager | `/actual/resolved/path/cloud-file-manager` | `v1.9.x` |
   | codap-data | `/actual/resolved/path/codap-data` | `master` |
   | codap-data-interactives | `/actual/resolved/path/codap-data-interactives` | `master` |
   | codap-transformers | `/actual/resolved/path/codap-transformers` | `main` |
   | noaa-codap-plugin | `/actual/resolved/path/noaa-codap-plugin` | `main` |
   | story-builder | `/actual/resolved/path/story-builder` | `master` |

   Use AskUserQuestion: "Do these repository paths and branches look correct?"
   - **Yes, proceed** - Continue with validation
   - **I need to adjust some paths** - Let user specify corrections

3. **Verify tools:**

   Explain to the user:
   > CODAP V2 and the CFM use older build dependencies that require the `--openssl-legacy-provider` flag on Node 17+. Any recent Node version (18+) works with this flag. The SproutCore build tool (`sproutcore`) is a Ruby gem. `jq` is used by the CFM version recording script. SSH access to the deploy server is needed for the final deployment step.

   ```bash
   node --version    # Must be v18+
   npm --version
   which sproutcore  # SproutCore build tool
   which jq          # JSON processor (needed by bin/recordCFMVersion)
   which ssh
   ```

   **Fixes to offer:**
   - **Node not v18+:** Offer to install a recent LTS version via nvm.
   - **jq missing:** Offer to install with `brew install jq`.
   - **sproutcore missing:** Instruct user to install via `gem install sproutcore`.

   Re-verify after each fix until all tools pass.

4. **Verify each repository:**

   For each repository, check existence, current branch, and modified files:
   ```bash
   [ -d "$REPO_PATH" ] && echo "EXISTS" || echo "MISSING"
   git -C "$REPO_PATH" rev-parse --abbrev-ref HEAD
   # Modified/staged files (block the build)
   git -C "$REPO_PATH" status -s | grep -v '^??' | wc -l
   # Untracked files (do NOT block the build)
   git -C "$REPO_PATH" status -s | grep '^??' | wc -l
   ```

   Report results in a table:

   | Repository | Exists | Branch | Modified | Untracked |
   |------------|--------|--------|----------|-----------|
   | codap | YES | master | 0 | 2 |
   | cloud-file-manager | YES | v1.9.x | 0 | 0 |
   | ... | ... | ... | ... | ... |

   **Modified/staged files block the build** and must be committed, stashed, or discarded before proceeding.
   **Untracked files are fine** and do not affect the build.

   If any repository has issues (missing, wrong branch, modified files), stop and ask user how to proceed. Offer appropriate actions:
   - **Wrong branch:** Offer to switch with `git -C "$REPO_PATH" checkout <expected>`
   - **Modified files:** Ask user to commit, stash, or discard
   - **Missing repo:** Ask user to clone it

   Re-verify until all repositories pass.

5. **Pull latest for all repositories:**

   Ask user: "Should I run `git pull` for all repositories?"

   If yes, run `git pull` in each repo directory and show results.

   **After pulling, re-verify cleanliness** — a pull could introduce merge commits or conflicts that leave a repo dirty. Re-check modified file counts for any repo that had updates. If any repo is now dirty, stop and resolve before proceeding.

6. **Verify npm dependencies are installed:**

   Check that `node_modules` exists in repositories that need it:
   - `codap`
   - `cloud-file-manager`
   - `codap-data-interactives` (and subdirectories: `DrawTool`, `eepsmedia/plugins/scrambler`, `Importer`, `Sonify`, `TP-Sampler`)
   - `codap-transformers`
   - `noaa-codap-plugin`
   - `story-builder`

   If any are missing, offer to run `npm install` (with `--legacy-peer-deps` for codap and CFM).

   Even if all `node_modules` directories exist, offer the user the option to re-run `npm install` in all repositories — `package.json` or `package-lock.json` may have changed since dependencies were last installed (e.g. after `git pull`).

   **After running `npm install`, re-verify cleanliness** — `npm install` can modify `package-lock.json` in some repos. Re-check modified file counts and ask the user to commit or discard any changes before proceeding.

7. **Summary:**

   > **Precondition validation complete.**
   >
   > - Repositories: all present, correct branches, clean
   > - Config files: `~/.codap-build.rc` and `~/.porc` present
   > - Tools: Node 18+, npm, sproutcore, jq, ssh
   > - Dependencies: installed
   >
   > Ready for Phase 2: Pre-Build Preparation. Run `/codap-v2-build prep` or say "continue" to proceed.

## Phase 2: Pre-Build Preparation

**Goal:** Update CFM, translations, plugin versions, and extension records before the build.

### Steps

1. **Check what has changed since the last build:**

   Explain to the user:
   > CODAP V2 builds include code from 6 sibling repositories in addition to the main codap repo. Each time a build is produced, the codap repo records the git commit hashes of all sibling repos (in files like `.codap-data-interactives_githash` and `cfm-version.txt`). By comparing these stored hashes against the current HEAD of each repo, we can determine exactly what has changed since the last build.
   >
   > This check must happen before any build steps that would update the stored hashes.

   ```bash
   # CFM: compare commit hash in cfm-version.txt vs current HEAD
   stored=$(grep '^commit:' cfm-version.txt | awk '{print $2}')
   current=$(git -C ../cloud-file-manager rev-parse HEAD)

   # Other repos: compare .<repo>_githash files vs current HEAD
   stored=$(cat .codap-data-interactives_githash | tr -d '[:space:]')
   current=$(git -C ../codap-data-interactives rev-parse HEAD)
   # (repeat for codap-data, codap-transformers, story-builder, noaa-codap-plugin)
   ```

   Report results in a table:

   | Repository | Changed Since Last Build |
   |------------|------------------------|
   | cloud-file-manager | Yes / No |
   | codap-data | Yes / No |
   | codap-data-interactives | Yes / No |
   | codap-transformers | Yes / No |
   | noaa-codap-plugin | Yes / No |
   | story-builder | Yes / No |

   This table drives the remaining steps in this phase.

2. **Pull CFM strings:**

   Explain to the user:
   > The Cloud File Manager (CFM) provides the file open/save UI in CODAP. Like CODAP itself, the CFM's user-facing strings are managed in POEditor and must be pulled before building. We always pull CFM strings regardless of whether CFM code has changed, because translators may have updated strings in POEditor since the last build.

   ```bash
   cd ../cloud-file-manager && npm run strings:pull
   ```

   Check if the CFM repo is now dirty:
   ```bash
   git -C ../cloud-file-manager status -s
   ```
   If dirty, commit the string updates in the CFM repo:
   ```bash
   git -C ../cloud-file-manager add -A
   git -C ../cloud-file-manager commit -m "chore: string updates"
   git -C ../cloud-file-manager push
   ```

3. **Build CFM (if changed or strings updated):**

   Explain to the user:
   > The CFM is built separately and its output is bundled into the codap repo at `apps/dg/resources/cloud-file-manager/`. The `build:cfm` script builds the CFM via webpack and records the CFM version and commit hash in `cfm-version.txt`.

   Build the CFM if **either** the CFM hash differs from the last build (Step 1) **or** pulling strings dirtied the CFM repo (Step 2):
   ```bash
   npm run build:cfm
   ```
   This builds the CFM and records the new CFM version/hash. Check if codap repo is now dirty:
   ```bash
   git status -s
   ```
   If dirty, commit the CFM update:
   ```bash
   git add cfm-version.txt apps/dg/resources/cloud-file-manager/
   git commit -m "chore: update CFM"
   ```

   If CFM has not changed **and** no string updates, skip this step.

4. **Update CODAP translations:**

   Explain to the user:
   > CODAP supports 17 languages via POEditor (poeditor.com). POEditor is the single
   > source of truth for translations — the push from git to POEditor is additive only
   > (it can add new terms and update existing values, but never deletes terms). This is
   > important because CODAP V2 and V3 share the same POEditor project, so each must be
   > able to push without affecting the other's strings.
   >
   > Before pushing, we'll compare the local English strings against what's currently in
   > POEditor so you can see what will be added or changed.

   **Constants:**
   - POEditor project ID: `125447`
   - API token: read from `~/.porc` (source the file to get `$API_TOKEN`)
   - Source file: `lang/strings/en-US.json`

   **4a. Compare local English strings with POEditor:**

   Source the API token and download the current English strings from POEditor:
   ```bash
   source ~/.porc
   ./bin/strings-pull.sh -p 125447 -l en-US -o /tmp -a "$API_TOKEN"
   ```

   Normalize both files for comparison. The local file may contain JSON comments and
   uses empty strings (`""`), while POEditor uses zero-width spaces (`\u200b`) for
   empty values:
   ```bash
   # Normalize POEditor download: sort keys, convert zero-width spaces to empty strings
   jq -S 'with_entries(if .value == "\u200b" then .value = "" else . end)' \
       /tmp/en-US.json > /tmp/poeditor-en.json

   # Normalize local file: strip comments, sort keys
   ./node_modules/.bin/strip-json-comments lang/strings/en-US.json | jq -S '.' \
       > /tmp/local-en.json
   ```

   Compare the two normalized files:
   ```bash
   diff /tmp/local-en.json /tmp/poeditor-en.json
   ```

   **If identical:** Report to the user:
   > Local English strings match POEditor. No push needed.

   Clean up temp files and skip to step 4b.

   **If different:** Analyze the differences using the two normalized JSON files:
   - **Keys in local but not in POEditor** — will be ADDED as new terms
   - **Keys in POEditor but not in local** — will be LEFT ALONE (the push is additive only)
   - **Keys with different values** — English text will be UPDATED in POEditor

   Present a summary, e.g.:
   > **English strings: local vs. POEditor**
   > - 3 new terms to add
   > - 5 terms only in POEditor (will not be affected)
   > - 2 terms with changed values
   >
   > [show the specific additions and changes]

   Use AskUserQuestion: "Your local English strings differ from POEditor as shown
   above. Do you want to push these changes to POEditor?"
   - **Yes, push to POEditor** — Run `./bin/strings-push-project.sh -a "$API_TOKEN"`
     and show the API response
   - **No, skip the push** — Continue without pushing

   Clean up temp files:
   ```bash
   rm -f /tmp/en-US.json /tmp/poeditor-en.json /tmp/local-en.json
   ```

   **4b. Pull translations:**

   This uses the improved `strings-pull-project.sh` which pulls each language
   individually with timeout protection, automatically retries failures, and reports
   streaming progress. The user can press Ctrl-C to cancel if POEditor is unresponsive.

   ```bash
   source ~/.porc
   ./bin/strings-pull-project.sh -a "$API_TOKEN"
   ```

   If the script exits with a non-zero status, some languages failed. Report which
   ones and ask the user how to proceed.

   After the script completes, **always present a markdown summary table** of the
   results (the streaming Bash output may be collapsed in the UI). Check `git status`
   to determine which languages actually had changes vs. which were pulled but
   unchanged:
   ```bash
   git status -s
   ```

   Present a table like:

   | Language | Status | Changed |
   |----------|--------|---------|
   | de | Success | Yes |
   | el | Success | No |
   | ... | ... | ... |

   If there are string changes:

   **4c. Propagate to plugins:**

   Explain to the user:
   > Some CODAP plugins (Importer, TP-Sampler, Scrambler, Story Builder) also have
   > translatable strings in the same POEditor project. We pull the plugin-specific
   > strings to their respective repositories.

   Read the API token from `~/.porc` and pass to the script:
   ```bash
   npm run strings:pull:plugins -- --APIToken=XXXX
   ```
   (Replace XXXX with the token from `~/.porc`)

   **4d. Check sibling repos for changes:**
   ```bash
   git -C ../codap-data-interactives status -s
   git -C ../story-builder status -s
   ```

   **4e. Commit string changes in codap:**
   ```bash
   git add apps/dg/*.lproj/
   git commit -m "chore: string updates for build XXXX"
   ```

   **4f. Commit string changes in affected plugin repos** (codap-data-interactives,
   story-builder):
   ```bash
   git -C ../codap-data-interactives add -A
   git -C ../codap-data-interactives commit -m "chore: string updates"
   git -C ../codap-data-interactives push
   ```
   (Repeat for story-builder if changed)

   **4g.** If story-builder has string changes, remind user that a separate deploy of
   story-builder will be required since it is not built automatically as part of the
   CODAP build process.

5. **Increment plugin build number (if codap-data-interactives changed):**

   Explain to the user:
   > The standard plugins in `codap-data-interactives` have their own build number, separate from CODAP's. If there have been changes to the plugins since the last build (detected in Step 1), the plugin build number should be incremented so users can tell which version of the plugins they're running.

   If codap-data-interactives changed since the last build (from Step 1), increment the plugin build number:
   ```bash
   cd ../codap-data-interactives
   npm run std:increment-build-number
   git add -A
   git commit -m "chore: increment plugin build number"
   git push
   ```

   If codap-data-interactives has not changed, skip this step.

6. **Record extension versions:**

   Explain to the user:
   > Before building, we record the current git commit hash of each sibling repository in the codap repo. These hash files (e.g., `.codap-data-interactives_githash`) serve as a record of exactly which version of each component was included in the build, and are used in Step 1 of future builds to detect changes.

   ```bash
   npm run record:extn
   ```

   Check for changes:
   ```bash
   git status -s
   ```

   If dirty (expected if any sibling repos were updated):
   ```bash
   git add .codap-data_githash .codap-data-interactives_githash .codap-transformers_githash .story-builder_githash .noaa-codap-plugin_githash
   git commit -m "chore: update plugin git hashes"
   ```

7. **Push codap changes:**
   ```bash
   git push
   ```

8. **Run lint:**
   ```bash
   npm run lint
   ```
   If lint errors are found, stop and ask user to fix them before proceeding.

9. **Summary:**

   > **Pre-build preparation complete.**
   >
   > - CFM: [rebuilt / no changes]
   > - Translations: [updated / no changes]
   > - Plugin build number: [incremented / no changes]
   > - Extension records: [updated / no changes]
   > - Lint: [passed]
   >
   > Ready for Phase 3: Automated Build. Run `/codap-v2-build build` or say "continue" to proceed.

## Phase 3: Automated Build

**Goal:** Increment build number, build the release, and deploy to server.

Explain to the user:
> This phase is the core of the build process. It corresponds to what the `bin/do-full-build-process` shell script does, but we'll execute each step individually with confirmation rather than running the full script. The original script is interactive too — it pauses for 'y/n' confirmation between steps so the build engineer can abort if errors occur.

### Steps

1. **Final cleanliness check:**
   ```bash
   git status -s | grep -v '^??'
   ```
   Must have no modified or staged files. Untracked files are fine and do not affect the build. If modified files exist, stop and resolve.

2. **Increment build number (optional):**

   Explain to the user:
   > CODAP's build number is stored in `apps/dg/core.js` as `BUILD_NUM`. Incrementing is optional — if you're re-running the build after an error, you may want to skip this to avoid burning through build numbers.

   Ask user: "Increment the build number?"

   If yes, perform these steps directly (do **not** use the `bin/updateBuildNumber` script, which incorrectly treats untracked files as dirty):

   a. Read the current build number:
      ```bash
      sed -nE "s/ *BUILD_NUM: '([0-9]+)'.*/\1/p" apps/dg/core.js
      ```

   b. Compute the new build number (zero-padded increment, e.g. `0742` → `0743`).

   c. Update `BUILD_NUM` in `apps/dg/core.js` using the Edit tool.

   d. Commit, tag, and push:
      ```bash
      git add apps/dg/core.js
      git commit -m "Build XXXX"
      git tag "build_XXXX"
      git push && git push --tags
      ```

3. **Get current build number:**
   ```bash
   # Extract BUILD_NUM from apps/dg/core.js
   sed -nE "s/ *BUILD_NUM: '([0-9]+)'.*/\1/p" apps/dg/core.js
   ```

   Display: `Build number: XXXX, Build string: build_XXXX`

4. **Build third-party bundle:**

   Explain to the user:
   > CODAP uses a number of third-party JavaScript libraries (React, SlickGrid, D3, etc.). These are bundled into a single file for production. This step creates that bundle.

   ```bash
   npm run build:bundle-prod
   ```
   Wait for completion. Ask user to confirm success.

5. **Build release:**

   Explain to the user:
   > This is the main build step. `makeCodapZip` orchestrates the entire release assembly:
   > 1. Runs `sproutcore build` to compile the CODAP application (minified, all 17 languages)
   > 2. Runs `makeExtn` to build standard plugins (from `codap-data-interactives`) and example documents (from `codap-data`)
   > 3. Generates a top-level `index.html` that detects the user's browser language and redirects to the appropriate localized version
   > 4. Fixes absolute path references in HTML, JS, and CSS files so the build can run from any URL path
   > 5. Packages everything into `codap_build_XXXX.zip`
   >
   > This step takes several minutes.

   ```bash
   bin/makeCodapZip build_XXXX
   ```

   Monitor output for errors. After completion, verify the zip file exists:
   ```bash
   ls -lh codap_build_XXXX.zip
   ```

6. **Copy release to server:**

   Explain to the user:
   > The zip file is copied to `codap-server.concord.org` via SCP. This server hosts all CODAP V2 releases.

   ```bash
   scp codap_build_XXXX.zip codap-server.concord.org:
   ```

   After the copy succeeds, ask the user if they want to delete the local zip file. If yes:
   ```bash
   rm codap_build_XXXX.zip
   ```

7. **Deploy on server:**

   Explain to the user:
   > The `deployCODAP` script on the server unzips the build into the releases directory and makes it accessible at a versioned URL. It does not update the `latest` symlink — that happens after QA approval.

   ```bash
   ssh codap-server.concord.org "sudo deployCODAP codap_build_XXXX.zip"
   ```

8. **Verify deployment:**

   Ask the user to open the build and verify that it looks correct:
   > The build is now live at `https://codap.concord.org/releases/build_XXXX/`
   >
   > Please open this URL, verify the build loads and works correctly, and let me know when you're satisfied.

   **Wait for the user to confirm the build looks good before proceeding.** Do not move on to the summary or Phase 4 until the user has acknowledged that the build works.

9. **Summary:**

   > **Build and deployment complete.**
   >
   > - Build number: XXXX
   > - Zip file: codap_build_XXXX.zip
   > - Deployed to: codap-server.concord.org
   > - URL: https://codap.concord.org/releases/build_XXXX/
   >
   > Ready for Phase 4: Post-Build. Run `/codap-v2-build post` or say "continue" to proceed.

## Phase 4: Post-Build

**Goal:** Notify QA and wrap up.

### Steps

1. **Post QA notification to Slack:**

   Explain to the user:
   > After deployment, the QA team needs to be notified so they can test the build. The notification is posted to the `#codap` Slack channel.

   **If Slack MCP server is available:**
   - Ask user for permission to post
   - Post using `mcp__slack__conversations_add_message`
   - Use `channel_id: #codap` and `content_type: text/markdown`

   **If Slack MCP server is NOT available:**
   - Show the user a draft and instruct them to paste it into Slack

   **Announcement format:**
   ```
   CODAP V2 build XXXX is available for testing at https://codap.concord.org/releases/build_XXXX/
   ```

2. **Reminder of manual follow-up steps:**

   Explain to the user:
   > The build is now deployed but not yet live for end users. The QA team will test it at the versioned URL. Once QA approves the build, the `latest` symlink on the server is updated to point to this build, making it the production version.

   > **Post-build checklist:**
   > - [ ] QA smoke test the build
   > - [ ] QA verify bug fixes and features
   > - [ ] After QA passes, update the `latest` symlink on the server
   > - [ ] Prepare release notes (if applicable)

3. **Done:**

   > **V2 build process complete!**
   >
   > Build XXXX has been deployed and QA has been notified.

## Repository Map

| Repository | Expected Branch | Purpose |
|------------|-----------------|---------|
| `codap` | `master` | Main CODAP v2 application |
| `cloud-file-manager` | `v1.9.x` | File storage integration (CFM) |
| `codap-data` | `master` | Example documents and boundary files |
| `codap-data-interactives` | `master` | Standard plugins |
| `codap-transformers` | `main` | Transformer plugin |
| `noaa-codap-plugin` | `main` | NOAA weather plugin |
| `story-builder` | `master` | Story Builder plugin |

## Key Files

| File | Purpose |
|------|---------|
| `apps/dg/core.js` | Contains `BUILD_NUM` |
| `bin/do-full-build-process` | Original automated build script |
| `bin/makeCodapZip` | SproutCore build + packaging |
| `bin/makeExtn` | Plugin/example assembly |
| `bin/updateBuildNumber` | Increment, commit, tag, push (not used by skill — treats untracked files as dirty) |
| `bin/recordExtnVersions` | Record sibling repo git hashes |
| `bin/recordCFMVersion` | Record CFM version |
| `~/.codap-build.rc` | Build configuration |
| `~/.porc` | POEditor API token |

## Jira Integration

Use these constants for all Atlassian MCP tool calls:

| Constant | Value |
|----------|-------|
| `cloudId` | `concord-consortium.atlassian.net` |
| `projectKey` | `CODAP2` |
