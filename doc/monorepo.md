# Typescript
Typescript is added as a dependency in the root of the project so that the whole project can be built and so VSCode can open the whole project. Without this VSCode would fallback to its bundled Typescript version, but that does not support Yarn PnP so it is necessary to install typescript.

# ESLint
ESLint is installed at the root of the project so that Yarn PnP can patch it and the vscode eslint plugin can use this patched version. Currently there is an empty eslint configuration at the root. This basically disables eslint for files at the root level. When a file is opened in a subfolder the vscode eslint plugin uses the configuration from that subfolder.

It is not currently possible to lint the entire workspace. Each subfolder has to be linted individually.

The eslint plugin is supported but continues to be slow. It required adding extra dependencies using Yarn's `packageExtensions` configuration. See below for a potential solution.

# TODO

## ESLint

**Re-enable the import cycle rule**

ESLint successfully works in the `v3` workspace. However with the import plugin enabled it is really slow.

With all of the import rules and plugin disabled:
`yarn eslint  30.34s user 2.17s system 189% cpu 17.161 total`

With the rules enabled:
`yarn lint  133.40s user 12.03s system 122% cpu 1:58.54 total`

With just the import cycle disabled:
`yarn lint  45.20s user 3.03s system 170% cpu 28.328 total`

The eslint-import-plugin-x is supposed to be faster. It uses a rust library to parse the imports but this is crashing when it encounters our "mobx-state-tree" overridden import. I've submitted a issue with a minimal reproduction and I'm hopeful it will get fixed by the maintainer. https://github.com/un-ts/eslint-plugin-import-x/issues/379

I think also that eslint-import-plugin-x will not require the `packageExtensions` configuration.

## Typescript Language Server
When I run `yarn dlx @yarnpkg/sdks --verbose vscode` at the root I get Eslint and Typescript sdks installed but I also get:
>  Typescript Language Server (dependency not found; skipped)

I'm guessing this might be for something other than vcode like emacs perhaps, but if we have problems it might be worth looking into.

## What about Typescript plugins
Do I need to install and setup any typescript plugins in the root? Or will typescript and yarn work together so they are used from the workspace that needs them?

## Linting root files
Currently there is no linting of the files at the root of the workspace. We should lint some of them at least the `.github/workflow/*` files would be good to lint.

With typescript it is possible to typecheck the whole repository. With the current eslint setup
