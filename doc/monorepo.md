# Typescript
Typescript is added as a dependency in the root of the project so that the whole project can be built and so VSCode can open the whole project. Without this VSCode would fallback to its bundled Typescript version, but that does not support Yarn PnP so it is necessary to install typescript.

# ESLint
ESLint is installed at the root of the project so that Yarn PnP can patch it and the vscode eslint plugin can use this patched version. Currently there is an empty eslint configuration at the root. This basically disables eslint for files at the root level. When a file is opened in a subfolder the vscode eslint plugin uses the configuration from that subfolder.

It is not currently possible to lint the entire workspace. Each subfolder has to be linted individually.

The imports are linted with the new import-x eslint plugin. It is faster than the older import eslint plugin. It also has better support for Yarn PnP. However it did require a patch to work in a monorepo environment.

The no-cycle rule is much faster but overall the import-x plugin still makes eslint slow. With it disable the linting runs about twice as fast. Disabling just the no-cycle rule takes off 25s out of 66s for one run.

# TODO


## Typescript Language Server
When I run `yarn dlx @yarnpkg/sdks --verbose vscode` at the root I get Eslint and Typescript sdks installed but I also get:
>  Typescript Language Server (dependency not found; skipped)

I'm guessing this might be for something other than vcode like emacs perhaps, but if we have problems it might be worth looking into.

## Linting root files
Currently there is no linting of the files at the root of the workspace. We should lint some of them at least the `.github/workflow/*` files would be good to lint.

With typescript it is possible to typecheck the whole repository. With the current eslint setup
