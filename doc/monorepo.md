# Adding a new workspace (package)
Update the root files:
- package.json workspaces property
- tsconfig.json references property

## TODO:
- need a way to pass the boundary manager instance into the formulas package
- document how to use shared configurations for eslint and typescript
- once we've switched the v3 workspace to using the utilities workspace, see if there are unnecessary dependencies in v3 because all of their usage has been moved to utilities
- find a way to extract the duplicate code of the debug.ts which had to be added to `formulas`
- figure out how to update the formula tests so can be moved into the formulas package. Currently they use the CODAP document so they can't be moved in without bringing in lots of dependencies.
- put components/vars.scss in a common package, so the formula editor and v3 can share it there might be issues with getting yarn to allow the import from the package especially if the common package uses the "exports" property in its package.json

# Dependencies
Within packages/workspaces that are used by the main app (v3), managing their dependencies is tricky. In order to prevent duplicate 3rd party packages like React and MobX, peerDependencies should be used. In general it would be best to use peerDependencies for every package that is used directly by the app or any other package in the monorepo. This way there won't be duplication.

**However** using peerDependencies breaks VSCode's "find references" feature. When there seems to be any peerDependencies in the package.json, and you then search for references to the types defined within this workspace, VSCode finds nothing. My guess is that VSCode treats this as an external package when it finds peerDependencies.

## Additional peerDependency issues
If that issue gets fixed, and we can use peerDependencies here are more things to consider:

These peerDependencies often need to be specified as devDependencies. This is so that running the typescript compiler, linter, and jest can find these packages when processing the code in this package. So often each of these dependencies have to be specified twice. Additionally if the package is intended to be a library the best practice would be to use the lowest version of the peerDependency range as the devDependency. This way the types and code used during testing will be this lowest version. Assuming the dependency follows semantic versioning this approach will help make sure the library works with the whole range.

This can be cumbersome to maintain. A tool like `syncpack` might help with this.

**But** this practice of pinning to the lowest version of a peerDependency caused problems in the monorepo setup. When running the Jest tests in the app (v3) when the formulas package pinned "mobx" to a specific version the following error happened:
```
 FAIL  src/models/formula/formula-manager.test.ts
  ● FormulaManager › getAdapterApi › should return functional adapter api

    [mobx-state-tree] Factory.Type should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.Type`

      178 |       })
      179 |       const context = api.getFormulaContext(formula.id)
    > 180 |       expect(context.formula).toEqual(formula)
          |                               ^
      181 |       expect(context.adapter).toEqual(adapter)
      182 |       expect(context.dataSet).toEqual(dataSet)
      183 |       expect(context.isInitialized).toEqual(true)

      at Object.<anonymous> (src/models/formula/formula-manager.test.ts:180:31)
```
This seemed to happen because different versions of MobX were being used between the app (v3) and the library (formulas). In theory this shouldn't happen because the app should be using the peerDependency spec not the devDependency spec. However Jest is configured to work directly with the source code of the libraries (like formulas), in this case Jest (via Yarn PnP) is using the devDependency when MobX is imported. This makes sense since devDependencies are for compiling source code. See the "Jest" section below for why Jest is configured this way.

The solution to this problem is to not pin versions in the devDependencies, and instead use the same version spec that is used in peerDependencies and in the app. This is against the best practice for libraries, but at least it makes Jest work.

# Typescript
Typescript is added as a dependency in the root of the project so that the whole project can be built and so VSCode can open the whole project. Without this VSCode would fallback to its bundled Typescript version, but that does not support Yarn PnP so it is necessary to install typescript.

# ESLint
ESLint is installed at the root of the project so that Yarn PnP can patch it and the vscode eslint plugin can use this patched version. Currently there is an empty eslint configuration at the root. This basically disables eslint for files at the root level. When a file is opened in a subfolder the vscode eslint plugin uses the configuration from that subfolder.

It is not currently possible to lint the entire workspace. Each subfolder has to be linted individually.

The imports are linted with the new import-x eslint plugin. It is faster than the older import eslint plugin. It also has better support for Yarn PnP. However it did require a patch to work in a monorepo environment.

The no-cycle rule is much faster but overall the import-x plugin still makes eslint slow. With it disable the linting runs about twice as fast. Disabling just the no-cycle rule takes off 25s out of 66s for one run.

# TS-Lib
`ts-lib` is added to the root package.json to fix an issue with Jest and its transpiler. We have Jest transpile some of dependencies because they are distributed as ESM modules and Jest works with Common JS. When the transpiler tries to handle these it appears to be loading `ts-lib` as if it was required by one of the files in this package. These package don't depend on `ts-lib` so Yarn PnP fails this require. However because of the [top level fallback of Yarn PnP](https://yarnpkg.com/configuration/yarnrc#pnpFallbackMode) it will fallback to looking to see if the modules package is listed in the root package.json of the repository. This means that ts-lib has to be added to the root package.json to work around this issue. Hopefully Jest will fix this issue in the future.

# Jest
We are using the package.json `exports` feature so the modules in packages in the monorepo can be imported into other packages. This configuration causes issues for Jest. We are still using Jest in CommonJS "mode". So it looks for the `require` property on each export in the package.json. We are not building CommonJS versions of these packages so it would be broken to specify this `require` property.

The work around we are using instead is add a `moduleNameMapper` mapping for each package in the monorepo so Jest will just find its typescript files directly.

This does mean that Jest is building more files itself instead of taking advantage of one of the monorepo features which is so only the files in the current package need to be rebuilt. However it solves a problem of making sure that the files Jest is using are the latest version instead some stale build in the dist folder of that package.

Note: this approach prevents us from following the best practice of dependency version specs in the library packages like "formulas". If we can switch to using Jest in ESM mode instead of CommonJS mode it might allow us to remove the `moduleNameMapper`. One of the main blockers for making this switch is module level mocking. Jest doesn't have a good solution for mocking modules when running in ESM mode.

## VSCode find references
This is a very useful feature when working with a code base. In a monorepo keeping it working across workspaces is finicky.

Adding `peerDependencies` to a package.json seems to break it (see above)

The project references in the tsconfig.json files need to be setup so that VSCode knows the workspaces refer to each other. It isn't clear exactly what is required for this to work or not work. Currently there are references at the root tsconfig.json and each workspace that uses another workspace has references to that other workspace.

# TODO

## Typescript Language Server
When I run `yarn dlx @yarnpkg/sdks --verbose vscode` at the root I get Eslint and Typescript sdks installed but I also get:
>  Typescript Language Server (dependency not found; skipped)

I'm guessing this might be for something other than vcode like emacs perhaps, but if we have problems it might be worth looking into.

## Linting root files
Currently there is no linting of the files at the root of the workspace. We should lint some of them at least the `.github/workflow/*` files would be good to lint.

With typescript it is possible to typecheck the whole repository. With the current eslint setup
