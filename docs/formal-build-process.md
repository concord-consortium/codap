## The CODAP v2 Release Process

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
      * codap-transformers (node 16+?)
      * noaa-codap-plugin (node 18+?)
      * story-builder (node 16+?)
    * In the codap-data-interactives directory, run `npm install` in the
      following subdirectories:
        * ./DrawTool (node 16+?)
        * ./eepsmedia/plugins/scrambler (node 16+?)
        * ./Importer (node 16+?)
        * ./TP-Sampler (node 16+?)
* Non-automated part: checking on readiness
    * ~~Check on CFM **production** branch changes.~~
    * As of 2025, CODAP v3 development is using the `master` branch of CFM, while v2 is currently using the `v1.9.x` branch.
      Generally speaking, it has been the practice to update the CFM in CODAP
      prior to the commencement of the build so this step is mainly a reminder.
      ~~CFM changes should have a PT story in they CODAP project, but they don’t always.~~
      If there are CFM Changes, in the CODAP codeline run `npm run build:cfm`.
      Commit the changes.
    * Check on strings file changes:
        * in codap directory: `npm run strings:update`
        * then, `git status`. If the codeline is no longer clean, there have been changes
        * if there are changes, they need to be propagated to plugins. Run
          `npm run strings:pull:plugins -- --APIToken=XXXX`. This, of course, may dirty one or more of the plugin directories, which will have to be committed.
        * Note that this will update strings for the standard plugins in the `codap-data-interactives` repository (which are built automatically) _and_ for the `story-builder` plugin (which is _not_ built or deployed automatically as part of the build process), so a separate deploy of `story-builder` will be required if there are strings changes that affect it.
    * Assess whether plugin version number is updated or needs to be updated.
      That is to say assess whether there have been changes since the plugin
      build number was last changed.
      * If there have been, in the codap-data-interactives codeline run
        `npm run std:increment-build-number`.
    * Check on extension changes
        * in codap directory: `npm run record:extn`
            * this step records the git hashes for dependent directories in codap files.
        * then run `git status`. If the codeline is no longer clean, there have been
          changes. Commit them.
* Automated part
    * In codap directory, switch to node 16 (nvm is useful for this) and run `bin/do-full-build-process`.
      This script must be monitored by the build engineer because there are a sequence of
      points where the build engineer needs to indicate readiness to continue by entering ‘y’.
      If errors do occur, enter 'n'. This will abort the build.
    * Here are the steps in the execution of the script:
      1. verify clean repositories
      2. update build number
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
