# Case Card Port

## Introduction

The v2 case card code was written using React components rather than relying on the SproutCore view system. Therefore, the decision was made to port the v2 code into v3 rather than rewriting it from scratch. Due to the limitations of the v2 SproutCore build system, the v2 code is pre-ES6 and so does not use `import`, `export` or `class`. Instead, the code uses pre-ES6 React utilities like `createReactClass`, `createReactFactory`, and `ReactDOMFactories` as well as extensive use of globals. The goal of the initial port was to change the ported code as little as possible so as to minimize the likelihood of introducing additional issues if the code were being modernized and ported at the same time. Modernization is a worthy goal and a roadmap for doing so will is presented later in the document.

## Configuration

Ported source files were given the extension `.v2.js`. The ESLint and TypeScript configurations were updated to relax a number of the linting rules for files with that extension.

## Compatibility Code

A good deal of compatibility code was required to allow the ported v2 code to compile and run in the v3 environment. For instance,

| Module                    | Description |
| ------------------------- | ----------- |
| `sc-compat.ts`            | Defines the `SC` namespace, `SC.Object` class, and utility functions like `SC.empty()` and `SC.none()`. |
| `dg-compat.v2.js`         | Defines the `DG` namespace, the `DG.React` sub-namespace, and a number of other widely used classes and utility functions. |
| `dg-data-context.ts`      | A thin wrapper around a `DataSet` which implements a subset of the `DG.DataContext` interface. |
| `dg-collection-client.ts` | A thin wrapper around a `DataSet` and a `Collection` which implements a subset of the `DG.CollectionClient` interface. |
| `dg-collection.ts`        | A thin wrapper around a `DataSet` and a `Collection` which implements a subset of the `DG.Collection` interface. |
| `dg-attribute.ts`         | A thin wrapper around a `DataSet` and an `Attribute` which implements a subset of the `DG.Attribute` interface. |
| `dg-case.ts`              | A thin wrapper around a `DataSet` and a case ID which implements a subset of the `DG.Case` interface. |

## Core Case Card Code

The `src/components/case-card` folder contains the core case card source files. As mentioned previously, the initial goal was to port the code with minimal changes.

- Files were renamed to use hyphens instead of underscores and the `v2.js` extension.
- Necessary imports were added to the top of each file.
- Localizable strings like `'DG.SOME.STRING'.loc()`  were replaced with `v2t('DG.SOME.STRING').loc()`.
- Unused/unported code was sometimes commented out, e.g. dragging code.
- Local ESLint directives were sometimes added to address issues not disabled globally.

For most components, jest tests were written to exercise the core features of the component.

## Utility Code

Several utility modules were also ported. Since these utilities often provide the interface between the React components and the models, in some cases the code was changed more extensively, e.g. to replace calls to `DG.UndoHistory.execute()` will calls to `applyModelChange()`.

| Module                            | Description |
| --------------------------------- | ----------- |
| `dg-case-display-utils.v2.js`     | Modified to use `v2t()` and `applyModelChange()`. |
| `dg-data-context-utilities.v2.js` | Modified to use `v2t()` and `applyModelChange()`. Much of this module is currently unused. |
| `dg-formatter.v2.js`              | Largely unchanged. The v2 code was ported from Protovis (Mike Bostock's predecessor to D3), so a little bit of Protovis still lives in v3 for the nonce. |
| `dg-math-utilities.v2.js`         | The one function we need, `formatNumber()`, is essentially unchanged. |

## Remaining Functionality

- Dragging attributes from/to/within the case card
  - Need to integrate with DnDKit used by other components
- Attribute menu items (other than rename)
- Responding to notifications
  - Some notifications like adding/removing attributes and cases are handled via MobX observation, but others like value changes need additional work.
- Niceties like tooltips, focus-handling, etc. are likely to have issues.

## Modernization

Ultimately, we would like the case card code to look like the rest of the v3 code base, or at least reasonably so. Until that happens, the case card code will be more difficult to work with and provide a barrier to entry to developers. The modernization can happen in stages, which allows it to be prioritized and scheduled more easily.

1. Replace use of globals with standard `import`s and `export`s.
   - `DG.React.SomeComponent = ...` => `export SomeComponent` and `import { SomeComponent } from ...`
2. Replace use of `createReactClass` and `createReactFactory` with standard ES6 classes.
3. Replace use of `createReactFC` with standard functional components.
4. Replace use of `ReactDOMFactories` with JSX.
5. Convert to TypeScript and eliminate use of `PropTypes`.
6. Replace custom UI elements like the attribute menu with Chakra-based (accessible) alternatives.
