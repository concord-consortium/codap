# Typescript
Typescript is added as a dependency in the root of the project so that the whole project can be built and so VSCode can open the whole project. Without this VSCode would fallback to its bundled Typescript version, but that does not support Yarn PnP so it is necessary to install typescript.

# ESLint
ESLint is installed at the root of the project so that Yarn PnP can patch it and the vscode eslint plugin can use this patched version. Currently there is an empty eslint configuration at the root. This basically disables eslint for files at the root level. When a file is opened in a subfolder the vscode eslint plugin uses the configuration from that subfolder.

It is not currently possible to lint the entire workspace. Each subfolder has to be linted individually.

# TODO

## ESLint
Check that we can successfully run ESLint on the `v3` workspace. It might be necessary to use an experimental flag so eslint finds the closest config file, but that might only be necessary if we want to run eslint at the root of the project and have it figure things out correctly.


## Typescript Language Server
When I run `yarn dlx @yarnpkg/sdks --verbose vscode` at the root I get Eslint and Typescript sdks installed but I also get:
>  Typescript Language Server (dependency not found; skipped)

I'm guessing this might be for something other than vcode like emacs perhaps, but if we have problems it might be worth looking into.

## What about Typescript plugins
Do I need to install and setup any typescript plugins in the root? Or will typescript and yarn work together so they are used from the workspace that needs them?

## Linting root files
Currently there is no linting of the files at the root of the workspace. We should lint some of them at least the `.github/workflow/*` files would be good to lint.

With typescript it is possible to typecheck the whole repository. With the current eslint setup
