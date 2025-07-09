# Yarn
This repository uses yarn instead of npm. Additionally it uses the Plug'n'Play yarn installation strategy. This means there is no `node_modules` folder when the `yarn install` is run.

TODO: fill this out with much more info...

# Corepack and GitHub Actions

In GitHub actions we use:
```
npm uninstall -g yarn || true
npm install -g corepack
```

This is so yarn will be used correctly. Corepack is a tool that manages which version of yarn or pnpm is use. It also can prevent you from accidentally running a npm command in a yarn repository. It was included in Node versions 16 to 24. It is planned to be removed in Node version 25. But it can still be installed separately. The commands above will work with version of Node >= 18 (latest corepack is not compatible with Node 16 and 17).

# Patching packages
Detailed info:
https://yarnpkg.com/features/patching

Basic steps for a new patch:
1. run `yarn patch [package-name]`
2. edit the files in the temporary folder that it created
3. run `yarn patch-commit -s [temporary folder]`

Editing an existing patch:
1. run `yarn patch --update [package-name]`
2. edit the files in the temporary folder that it created
3. run `yarn patch-commit -s [temporary folder]`

# Yarn migration
This section might be useful for migrating other projects from npm to yarn. It is a list of steps that were taken. Some of them were probably reverted or changed later.

- removed node_modules
- ran `yarn import` to create yarn.lock from package-lock.json
- ran `yarn set version stable` embed the version 4 of yarn in the project this way it will be used regardless of what version users have globally
- switched to using yarn's built in patch support:
  - removed patch package from dependencies and scripts
  - for each patch in `/patches`:
    - `yarn patch [package name]`
    - `cd [temporary folder created by yarn]`
    - `patch -p4 < [path to patch file from patch package in /patches]` Note: sometimes -p3 is needed. This depends on the number of path segments in the patch file you want to ignore when applying a patch. For organization packages like `@nedb/binary-search-tree`, `-p4` is needed. For top level packages like `react-data-grid`, `-p3` is needed.
    - `cd -`
    - `yarn patch-commit -s [temporary folder created by yarn]`
  - updated references to "patch package" in the source code
- add vscode sdks `yarn dlx @yarnpkg/sdks vscode` so we can use yarn pnp instead of node_modules
- fix `mobx-state-tree` override: the `overrides` section of package.json is not supported by PnP. Instead an alias version specifier is used within dependencies `"mobx-state-tree": "npm:@concord-consortium/mobx-state-tree@6.0.0-cc.1"`
- remove the webpack config for our mobx-state-tree alias, with the approach above it was no longer needed.
- try to build the production bundle with webpack: `yarn build:webpack`. This resulted in 201 errors. It looks like these are caused by dependency issues surfaced by PnP.
- Copilot recommend running `yarn dlx @yarnpkg/doctor` but this lists a lot of errors that don't make sense. Like `Resolving @chakra-ui/icons@^2.2.4 errored with @chakra-ui/icons@^2.2.4 isn't supported by any available resolver` even though this is dependency is specified in the package.json
- I ran `yarn install` again and fixed the peer dependency warnings by `yarn add` or `yarn add -D` for each required peer dependency.
- Running `yarn build:webpack` resulted in just a single error about `@nedb/binary-search-tree` requiring the `util` module which is part of node.js and is no longer polyfilled by webpack. I think this worked without yarn PnP because the aws-sdk package has a dependency on `util` so it would be in node_modules and webpack would just use it there. With yarn PnP webpack won't settle for using a dependency from another package. This was solved adding a packageExtensions section to yarnrc.yml that indicates that `@nedb/binary-search-tree` needs `util`.
- Running `yarn start` seems to work.
- `yarn build:webpack` is slightly slower than `npm run build:webpack`:
  - `yarn build:webpack  201.05s user 15.74s system 136% cpu 2:39.38 total`
  - second run `yarn build:webpack  23.55s user 1.68s system 215% cpu 11.686 total`
  - `npm run build:webpack  186.00s user 14.68s system 134% cpu 2:29.65 total`
  - second run `npm run build:webpack  19.84s user 1.59s system 209% cpu 10.251 total`
- Note: if the user tries to run an npm command they will currently see a message about an unsupported protocol for the patch dependencies.
- Updating gitignore doing some other steps I don't remember, I ran `yarn start` again and this time I got complaints about `flat` and `flatMap` from typescript with the recommendation that I update the `lib` setting from es2018 to es2019. Doing that did fix the problems.
- In VSCode need to install the ZipFS extension. It is listed in the recommended extensions by this repository. This makes it possible to open the definitions of types from dependencies in VSCode
- Cypress used to have issues with PnP during the runtime but some of those are fixed: https://github.com/cypress-io/cypress/issues/8008 However component testing is apparently still broken.
- Cypress can't import modules in the config file when PnP is being used, that sounds like it will be fixed in Cypress 15: https://github.com/cypress-io/cypress/pull/31520