## The Formal Release Process

This document describes the partially manual, partially automated process for
assembling and deploying a CODAP build on the CODAP server. It is not a document 
to describe how to create a runnable local instance of CODAP for development.

* Prerequisites
  * Build person should have an account: `codap-server.concord.org`
* What is assembled for the build?
    * CODAP
    * CFM (Cloud File Manager)
    * Standard Plugins
    * Example Documents
    * Boundary files
* Setting Up Build Directories
    * The following Concord Consortium sourcecode repositories must be present, 
      synced with origin, clean, and on the `master` branch.
        * codap
        * cloud-file-manager
        * codap-data
        * codap-data-interactives
        * codap-transformers
        * story-builder
    * `npm install` should have been run on all codelines (and 
       `package.json`-bearing subdirectories in the codap-data-interactives codeline)
* Non-automated part: checking on readiness
    * Check on stories in progress
    * Check on CFM changes (CFM changes should have a story, but they don’t always)
    * Check on strings file changes
        * in codap directory: `npm run strings:update`
        * then, `git status`. If the codeline is no longer clean, there have been changes
        * if there are changes, they need to be propagated to plugins (TBD)
    * Check on extension changes
        * in codap directory: `npm run record:ext`
            * this step records the git hashes for dependent directories in codap files.
        * then `git status`. If the codeline is no longer clean, there have been 
          changes. Commit them.
    * Assess whether plugin version number is updated
* Automated part
    * in codap directory, `bin/do-full-build-process`
    * monitor for errors and answer ‘y’ at each point, if none.
* Release notes
  * The release notes are committed to the file, `Release-Notes.md` in the Git Hub wiki.
  * Release notes are prepared after the QA process has been completed to avoid
    including rejected stories or rejected releases in the notes.
  * Since this is also a git repository, it is most convenient to clone it locally, 
    then make your changes and push. It can be cloned from 
    https://github.com/concord-consortium/codap.wiki.git
  * The format of a release note has two parts. The first part describes the 
    release itself: when it was completed and released and any other pertinent 
    details. The second part lists the PT Stories that were completed as of the
    release.
