## The CODAP v2 Release Process

This document describes the process for assembling and deploying a CODAP v2
build to `codap-server.concord.org`. It is not a document for creating a local
development instance of CODAP. Note that CODAP v3 has an entirely different
deployment system.

### Overview

A CODAP v2 release assembles code from 7 repositories into a single deployable
zip file. The build is guided by the **`/codap-v2-build` skill** — a Claude Code
skill that walks the build engineer through each step interactively, handling
precondition validation, translations, plugin assembly, the SproutCore build,
server deployment, and QA notification.

The skill is defined in `.claude/skills/codap-v2-build/SKILL.md` and is invoked
in Claude Code with:

```
/codap-v2-build          # Start from Phase 1 (preconditions)
/codap-v2-build prep     # Resume at Phase 2 (pre-build preparation)
/codap-v2-build build    # Resume at Phase 3 (automated build)
/codap-v2-build post     # Resume at Phase 4 (post-build)
```

### What Gets Assembled

| Component | Repository | Branch | Purpose |
|-----------|------------|--------|---------|
| CODAP | `codap` | `master` | Main application |
| Cloud File Manager | `cloud-file-manager` | `v1.9.x` | File open/save UI |
| Standard Plugins | `codap-data-interactives` | `master` | Data analysis plugins |
| Example Documents | `codap-data` | `master` | Sample documents and boundary files |
| Transformers | `codap-transformers` | `main` | Transformer plugin |
| NOAA Plugin | `noaa-codap-plugin` | `main` | NOAA weather data plugin |
| Story Builder | `story-builder` | `master` | Story Builder plugin |

All repositories must be sibling directories with a common parent.

### Prerequisites

**Accounts:**
- GitHub — write access to all 7 repositories
- POEditor — API access to CODAP project (#125447) for translation management
- `codap-server.concord.org` — SSH access with root privileges for deployment

**Configuration files:**

| File | Purpose | Example |
|------|---------|---------|
| `~/.codap-build.rc` | Repository paths and server configuration | See below |
| `~/.porc` | POEditor API token | `API_TOKEN=XXXXXXXX` |

Example `~/.codap-build.rc`:
```shell
CFM_HOME=$HOME/Development/codap-build/cloud-file-manager
CODAP_DATA_HOME=$HOME/Development/codap-build/codap-data
CODAP_DATA_INTERACTIVES_HOME=$HOME/Development/codap-build/codap-data-interactives
CODAP_HOME=$HOME/Development/codap-build/codap
CODAP_SERVER=codap-server.concord.org
CODAP_SERVER_WWW_BASE=/var/www/html
```

Repositories not listed in `.codap-build.rc` default to sibling directories of
`CODAP_HOME` (e.g. `codap-transformers`, `noaa-codap-plugin`, `story-builder`).

**Tools:**
- Node.js 18+ (any recent version works; see [Node Version](#node-version) below)
- npm
- SproutCore (`gem install sproutcore`) — the Ruby-based build framework
- jq (`brew install jq`) — used by the CFM version recording script
- SSH/SCP — for server deployment

**Node dependencies:**

Run `npm install` (with `--legacy-peer-deps` for codap and cloud-file-manager)
in all repositories that have a `package.json`. Within `codap-data-interactives`,
also run `npm install` in: `DrawTool`, `eepsmedia/plugins/scrambler`, `Importer`,
`Sonify`, and `TP-Sampler`.

### The Four Phases

#### Phase 1: Validate Preconditions

Verifies that all 7 repositories are present, on the correct branches, and clean
(no uncommitted changes). Checks that configuration files and required tools are
available. Offers to fix common issues (wrong branch, missing tools, outdated
dependencies).

#### Phase 2: Pre-Build Preparation

1. **Check what changed** — Compares stored git hashes from the last build
   against the current HEAD of each sibling repository to determine what needs
   rebuilding.

2. **Pull CFM strings** — Downloads translated strings for the Cloud File
   Manager from POEditor. Commits if changed.

3. **Build CFM** — Rebuilds the CFM via webpack if code or strings changed.
   Records the new CFM version and commit hash in `cfm-version.txt`.

4. **Update CODAP translations** — This is the most involved step:

   - **Compare-before-push:** Downloads the current English strings from POEditor
     and compares them against the local `lang/strings/en-US.json`. If they
     differ, presents a summary of additions and changes for the build engineer
     to review before pushing. The push is additive only — it never deletes
     terms from POEditor (see [POEditor Safety](#poeditor-safety) below).

   - **Resilient pull:** Downloads translations for all 17 languages using the
     improved `strings-pull-project.sh` script, which pulls each language
     individually with a 60-second timeout and automatically retries failures
     up to 3 times.

   - **Propagate to plugins:** Pulls plugin-specific strings to
     `codap-data-interactives` and `story-builder`.

   - **Commit** all string changes across affected repositories.

5. **Increment plugin build number** — If `codap-data-interactives` has changed
   since the last build.

6. **Record extension versions** — Stores the current git hash of each sibling
   repository in the codap repo for future change detection.

7. **Push, lint** — Pushes all committed changes and runs ESLint.

#### Phase 3: Automated Build

1. **Increment build number** — Updates `BUILD_NUM` in `apps/dg/core.js`,
   commits, tags (`build_XXXX`), and pushes. Optional if re-running after an
   error.

2. **Build third-party bundle** — Bundles React, SlickGrid, D3, and other
   libraries into a single production file via webpack.

3. **Build release** — `bin/makeCodapZip` orchestrates the full assembly:
   SproutCore compilation (all 17 languages), plugin and example document
   assembly, language-redirect `index.html` generation, path fixups, and
   final packaging into `codap_build_XXXX.zip`.

4. **Deploy** — SCP the zip to `codap-server.concord.org`, then SSH to run
   `sudo deployCODAP` which unzips to the releases directory.

5. **Verify** — Confirm the build is accessible at
   `https://codap.concord.org/releases/build_XXXX/`.

#### Phase 4: Post-Build

1. **Notify QA** — Posts a message to the `#codap` Slack channel (via MCP if
   available, otherwise provides draft text to paste manually).

2. **Follow-up checklist** — QA smoke test, verify fixes/features, update the
   `latest` symlink after approval, prepare release notes if applicable.

### Key Scripts

| Script | Purpose |
|--------|---------|
| `bin/do-full-build-process` | Original interactive build script (Phase 3 steps) |
| `bin/makeCodapZip` | SproutCore build + plugin assembly + packaging |
| `bin/makeExtn` | Plugin and example document assembly |
| `bin/updateBuildNumber` | Increment build number, commit, tag, push |
| `bin/recordExtnVersions` | Record sibling repo git hashes |
| `bin/recordCFMVersion` | Record CFM version and commit hash |
| `bin/strings-pull.sh` | Pull a single language from POEditor |
| `bin/strings-pull-project.sh` | Pull all languages with retry (improved) |
| `bin/strings-push.sh` | Push English strings to POEditor (additive only) |
| `bin/strings-push-project.sh` | Push wrapper with project ID and input file |
| `bin/strings-build.sh` | Convert English JSON to SproutCore JS format |
| `bin/strings-pull-plugins` | Pull plugin strings to sibling repos |

### Key Files

| File | Purpose |
|------|---------|
| `apps/dg/core.js` | Contains `BUILD_NUM` |
| `lang/strings/en-US.json` | English source strings (with comments) |
| `apps/dg/*.lproj/strings.js` | Compiled per-language string files |
| `cfm-version.txt` | Stored CFM version and commit hash |
| `.*_githash` | Stored git hashes of sibling repos |
| `~/.codap-build.rc` | Build configuration (repo paths, server) |
| `~/.porc` | POEditor API token |

### Technical Notes

#### Node Version

CODAP v2 and the CFM were originally built with Node 16. As of 2025, all
repositories build successfully on Node 18 through 24 (current LTS) when the
`NODE_OPTIONS=--openssl-legacy-provider` environment variable is set. This flag
is needed because some older build dependencies (webpack 4, etc.) use OpenSSL
APIs that were removed in Node 17. The skill sets this flag automatically for
all build commands.

#### POEditor Safety

CODAP's 17 supported languages are managed in POEditor project #125447. The
push script (`bin/strings-push.sh`) uses `sync_terms=0`, which means it will
**add new terms** and **update existing values** but **never delete terms** from
POEditor. This is critical because CODAP V2 and V3 share the same POEditor
project — if either project pushed with `sync_terms=1`, it would delete the
other's terms along with all their translations.

The build skill implements a compare-before-push workflow: it downloads the
current English strings from POEditor, normalizes both files (stripping JSON
comments and converting zero-width space placeholders), and presents a diff to
the build engineer. This provides visibility into what will be added or changed
without risking data loss.

#### Translation Pull Resilience

The POEditor export API occasionally hangs during large batch downloads. The
improved `strings-pull-project.sh` script addresses this by:

- Pulling each of the 17 languages individually (via `strings-pull.sh`)
- Applying a 60-second timeout per language
- Automatically retrying failed languages up to 3 times
- Reporting streaming progress and a final summary

The build engineer can press Ctrl-C to cancel if POEditor is entirely
unresponsive.

---

## Legacy Build Documentation

The following is the original build documentation, retained for historical
reference. The process described above supersedes this documentation.

---

### The CODAP v2 Release Process (Original)

This document describes the partially manual, partially automated process for
assembling and deploying a CODAP v2 build on the CODAP server. It is not a document
to describe how to create a runnable local instance of CODAP for development.
Note that CODAP v3 has an entirely different deployment system.

* Prerequisites
  * Accounts: The build person will need access to a number of cloud accounts, as follows:
    * GitHub CODAP Project (`codap`)
    * ~~Pivotal Tracker, CODAP Project~~
      * ~~Scripts create a release story~~
    * POEditor, CODAP project
      * Scripts update string IDs and pull translated strings
    * codap-server.concord.org
      * The account should have root privileges.
  * RC files: Scripts, especially those involving the above cloud accounts,
    require configuration. These are "rc" files and must be placed in the
    user's home directory. If they relate to accounts, they should have
    appropriate permission settings.
    * ~/.porc: provides POEditor Account information. Example:
      ```shell
        API_TOKEN=XXXXXXXX
      ```
    * ~~/.ptrc: provides Pivotal Tracker Account information. Example:~~
      ```shell
        PROJECT_ID=1055240
        TOKEN=XXXXXXXX
        USER_NAME=xxxxxxxx
      ```
    * ~/.codap-build.rc: documents location of dependent source. Example:
      ```shell
        CFM_HOME=$HOME/work/cloud-file-manager
        CODAP_DATA_HOME=$HOME/work/codap-data
        CODAP_DATA_INTERACTIVES_HOME=$HOME/work/codap-data-interactives
        CODAP_HOME=$HOME/work/codap
        CODAP_SERVER=codap-server.concord.org
        CODAP_SERVER_WWW_BASE=/var/www/html
      ```
* What is assembled for the build?
    * CODAP
    * CFM (Cloud File Manager)
    * Standard Plugins
    * Example Documents
    * Boundary files
* Setting Up Build Directories

  The following Concord Consortium GitHub repositories must be present,
  synced with origin, clean, and on the appropriate branch (generally `master` or `main`).
  (This will be verified in the first step of the automated build process.)
  They should be sibling directories.
  That is, they should have a common parent directory.
  The directories should be the same as those documented in the above-mentioned `~/.codap-build.rc`.
    * [codap](https://github.com/concord-consortium/codap)
    * [cloud-file-manager](https://github.com/concord-consortium/cloud-file-manager)
    * [codap-data](https://github.com/concord-consortium/codap-data)
    * [codap-data-interactives](https://github.com/concord-consortium/codap-data-interactives)
    * [codap-transformers](https://github.com/concord-consortium/codap-transformers)
    * [noaa-codap-plugin](https://github.com/concord-consortium/noaa-codap-plugin)
    * [story-builder](https://github.com/concord-consortium/story-builder)

  The directories should be in the following condition (it is likely these are
  one time actions, but circumstances may require updates from time to time.)
  CODAP and the CFM currently require node 16. Others require at least the node
  version specified but may work with newer versions as well.
    * The CODAP instance should be runnable locally: see the
      [Developer Guide](https://github.com/concord-consortium/codap/wiki/Developer-Guide). (node 16)
    * The following directories have node dependencies, so, run `npm install` in them:
      * cloud-file-manager (node 16)
      * codap-data-interactives (node 16+?)
      * codap-transformers (node 16)
      * noaa-codap-plugin (node 18+?)
        * note that `npm install` must be run with node 18, but it can be built with node 16
      * story-builder (node 16)
    * In the codap-data-interactives directory, run `npm install` in the
      following subdirectories:
        * ./DrawTool (node 16+?)
        * ./eepsmedia/plugins/scrambler (node 16+?)
        * ./Importer (node 16+?)
        * ./Sonify (node 16+?)
        * ./TP-Sampler (node 16+?)
* Non-automated part: checking on readiness
    * ~~Check on CFM **production** branch changes.~~
    * As of 2025, CODAP v3 development is using the `master` branch of CFM, while v2 is currently using the `v1.9.x` branch.
      Generally speaking, it has been the practice to update the CFM in CODAP
      prior to the commencement of the build so this step is mainly a reminder.
      ~~CFM changes should have a PT story in they CODAP project, but they don't always.~~
      If there are CFM Changes, in the CODAP repository run `npm run build:cfm`.
      Commit the changes.
    * Check on strings file changes:
        * in codap directory: `npm run strings:update`
          * note that the `strings:pull` script (which is called by `strings:update`) sometimes hangs part of the way through, so make sure it runs to completion before moving on. It can be useful to call `strings:pull` directly in these cases.
        * then, `git status`. If the repository is no longer clean, there have been changes
        * if there are changes, they need to be propagated to plugins. Run
          `npm run strings:pull:plugins -- --APIToken=XXXX`. This, of course, may dirty one or more of the plugin directories, which will have to be committed.
        * Note that this will update strings for the standard plugins in the `codap-data-interactives` repository (which are built automatically) _and_ for the `story-builder` plugin (which is _not_ built or deployed automatically as part of the build process), so a separate deploy of `story-builder` will be required if there are strings changes that affect it.
    * Assess whether plugin version number is updated or needs to be updated.
      That is to say assess whether there have been changes since the plugin
      build number was last changed.
      * If there have been, in the codap-data-interactives repository run
        `npm run std:increment-build-number`.
    * Check on extension changes
        * in codap directory: `npm run record:extn`
            * this step records the git hashes for dependent directories in codap files.
        * then run `git status`. If the repository is no longer clean, there have been
          changes. Commit them.
* Automated part
    * In codap directory, switch to node 16 (nvm is useful for this) and run `bin/do-full-build-process`.
      This script must be monitored by the build engineer because there are a sequence of
      points where the build engineer needs to indicate readiness to continue by entering 'y'.
      If errors do occur, enter 'n'. This will abort the build.
    * Here are the steps in the execution of the script:
      1. verify clean repositories
      2. increment build number
         * incrementing the build number is optional -- this is useful to avoid burning through additional build numbers when errors occur.
      3. ~~make Pivotal Tracker release story~~
      4. make the third party bundle
      5. make release through the Sproutcore build process
      6. copy release to codap-server and deploy
    * Generally, the number of things that will have to be cleaned up increases
      as the build progresses. ~~If the build fails after step 3, the PT release story should
      have its title modified to indicate it was abandoned.~~ If the build fails after
      step 4, the CODAP directory will no longer be clean and work products will
      need to be removed.
* Post-build:
  * Inform QA of the build by posting a message in the CODAP channel on slack.
  * ~~In the Pivotal Tracker CODAP project, make sure stories for the build have the `qa-test` label.~~
* Release notes (have not been updated in the wiki since 2022)
  * ~~The release notes are committed to the file, `Release-Notes.md` in the GitHub wiki.~~
  * Release notes are prepared after the QA process has been completed to avoid
    including rejected stories or rejected releases in the notes.
  * Since this is also a git repository, it is most convenient to clone it locally,
    then make your changes and push. It can be cloned from
    https://github.com/concord-consortium/codap.wiki.git.
  * The format of a release note has two parts. The first part describes the
    release itself: when it was completed and released and any other pertinent
    details. The second part lists the PT Stories that were completed as of the
    release.

### Notes

#### makeCodapZip

The `makeCodapZip` script in the `codap` repository is the workhorse of the build process. In addition to building the CODAP application it runs the `makeExtn` script to update the standard plugins and example documents.  The `makeExtn` script runs the `bin/build` script in the `codap-data-interactives` repository (to build the standard plugins) and `npm run build` in the `codap-data` repository to build example documents and boundary data.
