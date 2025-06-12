I'd like to try to break CODAP into modules so it isn't a monolith project. I've wanted to do this with CLUE but it seems doing it with CODAP would be the same.

From my reading of the yarn support of mono-repos this can be done without majorly changing the source code structure. We could define src as the main set of source code.  And then add additional folders for the modules we want to split out.

The biggest problem with this is how we handle the package.json dependencies for the source folder. Since that would be the parent of any module if it installed its node_modules next to package.json (like it is doing now) those would be picked up by the other modules.

Another approach would be to add additional folders next to the `v3` folder at the root. Like `v3-formulas`. I suspect many people have setups like me where they've checked out the repo but pointed vscode just at the v3 folder. When I had vscode pointed at the parent folder before this caused problems with typescript I think.

I guess a question is to figure out what the plan is for the v3 folder in the long term.

So here are some options:
- v3 as module: `<root>/v3 -> <root>/v3-core, <root>/v3-formulas`
- v3 as root: `<root>/v3 -> <root>/v3/core, <root>/v3/formulas`
- v3 mixed: `<root>/v3 -> <root>/v3, <root>/v3/formulas`

## v3 as module
requires users to open codap root in vscode. this might cause typescript issues and we have the question of what do with the package.json in the root which is current for v2.

Probably be best to move the v2 code into a module itself so this way the v3 package.json and source code would not be mixed at the root of the v3 modules. We could leave the v3 folder with the same name instead of renaming it `v3-core`. So it ought to have a minor impact on other CODAP v3 developers. It would have a lot of renaming of the v2 files but that ought to be OK

## v3 as root
This would require renaming pretty much all of CODAPv3 source so it would be very invasive to existing developers git work.

## v3 mixed
It isn't clear how well this would work. There would be conflicts of node_modules and package.json files.

## yarn dependency
It would be great to switch to yarn dependency management so vscode, node, jest, and webpack would not be able to load dependencies from the parent project if they aren't specified in the current package json. However I'd guess this will cause of lots of problems. This change could be tested without the mono-repo change to see what works and doesn't work.

## we could look at using npm instead of yarn
The yarn docs are so much better it seems, but I have't looked at the npm ones in a while.

## Things to try?
- try switching to yarn with the existing v3 code
- try having vscode work the the root folder again to understand what the issues are
- learn how to best to share configurations of tools in a yarn mono-repo? Do we have a shared configuration at the root? Do we have a shared module with all of the re-usable configs which is then imported by each module? Do we just duplicate all of the config in each module?
- the configs we have are:
  - eslint
  - postcss
  - tsconfig
  - webpack
  - cypress
  - jest
  - nyc configuration for cypress coverage

## Global Scripts
https://yarnpkg.com/features/workspaces#global-scripts
With yarn workspaces global scripts can be picked up from any workspace as long as they have `:` in them and there aren't duplicates in the repository.
I think this means it would work fine to have a top level package.json file or to have a sub module with the shared scripts in it.

## Eslint config
This issue discusses how to use eslint flat files with a mono repo: https://github.com/eslint/eslint/discussions/16960
It seems like the best option is to have a package with the shared config which is then imported in each code package's eslint config. This means that eslint has to be run separately in each code package. This can be managed by using `yarn foreach`.
It is possible to have a single top level eslint config, but then you can't lint just a single package at a time (as far as I can tell by reading that issue)

## Postcss
Seems like this is mainly used for the autoprefixer plugin which adds vendor specific prefixes based on the caniuse data.

It is loaded by webpack using the postcss-loader. This wepback config doesn't explicitly declare the location of the config file. I'd guess that it looks for it relative to the webpack config. So it might work to have a common config in the root. However one recommendation is to have a common config in a "config" package and then import that into separate "empty" configs in each code package: https://shubhamverma.me/blog/setup-tailwind-css-with-turborepo
Linked from here: https://github.com/tailwindlabs/tailwindcss/discussions/9890

# Peer dependency comparison
NPM from v3-v6 did not automatically install peer dependencies.
Since v7, it started installing peer dependencies automatically.
NPM also became strict about conflicting peer dependencies with v7, so if there are conflicts it will cause an error and not finish the dependency installation.

Yarn v2, v3, and v4 are also supposed to automatically install peer dependencies. However when combined with the strict dependency checking of the PnP install mode, these implicit dependencies cannot not be imported or required. So it is necessary add these peer dependencies at least to the top level package.json so they can be used.

For completeness there are also optional peer dependencies which are supported by both yarn and npm. These will show up in yarn's `yarn explain peer-requirements`, but they shouldn't cause errors if they are not installed. If used properly they shouldn't cause errors if they aren't added to the any of the package.json files.

# Yarn migration:
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

## Cypress Issues
- Cypress used to have issues with PnP during the runtime but some of those are fixed: https://github.com/cypress-io/cypress/issues/8008 However component testing is apparently still broken.
- Cypress can't import modules in typescript or esm config files when PnP is being used, that is supposed to be fixed in Cypress 15: https://github.com/cypress-io/cypress/pull/31520 In the meantime the config file is switched to common js to work around this issue.

## Linking to local external libraries
From what I can tell `yalc` will continue to work with yarn PnP, but I haven't tested it.

Also modern yarn (>=2) supports a `portal:` protocol for dependencies. This https://yarnpkg.com/protocol/portal is like the `link:` protocol but it treats the package.json of the local package like any other package. This means that the dependencies of the local project are available correctly.

The advantage of using the `portal:` approach is that changes in the local dependency should be available immediately to the main project. With `yalc` you have to explicitly republish the local dependency.

The advantage of using `yalc` is that the local dependency will be built just like when it is published for real. This means any transpiled code and assets are processed the same way they would be when the package is published for real. Often this makes working local dependencies easier than trying to figure out why they aren't working with the direct link approach.

## Typescript configuration
One recommendation is to use project references:
https://www.typescriptlang.org/docs/handbook/project-references.html
In dese models and foss simulation we do not have a main typescript config. We just have separate typescript configs for each project.
In dese models there seems to be a single vscode config.
In foss simulations there are separate vscode configs for each workspace.

In foss simulations there is a common folder which has a shared webpack config file for all of the workspaces.

I should check to see if we are using these in the dese models or foss simulations repos.

## Interesting Notes
It is possible to mix module resolutions in a mono-repo:
https://yarnpkg.com/getting-started/recipes
In other words some workspaces in the mono-repo can use node-modules instead of PnP.

A useful article about some of this:
https://semaphore.io/blog/typescript-monorepos-with-yarn
