# Formulas in CODAP v3

This document provides an overview of the formula system in CODAP v3, including the architecture of formula adapters, the management of formula dependencies and recomputation, and the editor.

## Formula Adapter Architecture

The Formula Adapter system in CODAP v3 is designed to manage formulas across different contexts (such as attributes, filters, graphs, etc.) in a modular and extensible way. Rather than creating a separate adapter instance for every formula, the architecture uses a single adapter instance per formula type or context, with each adapter managing all formulas of its type.

### List of Formula Adapter Classes

The following adapter classes are implemented in the codebase:

- `AttributeFormulaAdapter`
- `FilterFormulaAdapter`
- `DataDisplayFilterFormulaAdapter`
- `GraphFilterFormulaAdapter`
- `BaseGraphFormulaAdapter`
- `PlottedFunctionFormulaAdapter`
- `BarChartFormulaAdapter`
- `PlottedValueFormulaAdapter`
- `MapFilterFormulaAdapter`

These classes cover formulas for attributes, filters, graphs, maps, and specific graph adornments.

### Key Concepts

- **Adapter-per-Type, Not per-Formula:**
  - Each adapter class (e.g., `AttributeFormulaAdapter`, `FilterFormulaAdapter`, `PlottedFunctionFormulaAdapter`) is instantiated once per context/type, not per individual formula.
  - For example, there is one `AttributeFormulaAdapter` per formula manager, which manages all attribute formulas in all datasets it is responsible for.

- **Managing Multiple Formulas:**
  - Each adapter instance manages all formulas of its type. Methods like `getActiveFormulas()` return an array of `{ formula, extraMetadata }` for all relevant formulas.

- **FormulaManager Coordinates Adapters:**
  - The `FormulaManager` holds a list of adapters (`adapters: IFormulaManagerAdapter[]`). It delegates formula-related operations (recalculation, error handling, etc.) to the appropriate adapter based on the formula type/context.

- **Adapters Use Metadata:**
  - When an operation is performed on a formula (e.g., recalculation), the manager passes the formula context and extra metadata to the adapter, which then acts on the correct formula.

- **Adapters and Content Models:**
  - Some adapters (especially for graphs or maps) can track content models (e.g., graph tiles) and manage formulas within those models. Methods like `addContentModel` and `removeContentModel` are provided for this purpose.

#### Example: AttributeFormulaAdapter

- The `AttributeFormulaAdapter` manages all attribute formulas in all datasets.
- Its `getActiveFormulas()` method iterates over all datasets and their attributes, collecting all formulas.
- When recalculating a formula, it uses the formula context and extra metadata to identify and update the correct attribute values in the dataset.

## Formula Dependency Management and Recomputation

Formulas in CODAP can depend on attributes in the same dataset, boundaries, global values, or lookup an attribute from another dataset. The system must track these dependencies to ensure formulas are recomputed when their dependencies change. Also if a dependency is renamed the formula is updated with the new name.

- Each formula's dependencies are determined by parsing its expression and identifying references to dependencies. This is done by `getFormulaDependencies`.
- The Formula Manager watches for changes to the active formulas and then gets the dependencies for any updated formula.
- Observers are added to the dependencies to trigger recalculation of the formula.

### Cycles

Attribute formulas can have dependency cycles, so the FormulaAdapters have a method `getFormulaError` which is used by the Attribute formula adapter to identify such cycles and show an error.

### Observers and Recomputation

The dependencies identified by getFormulaDependencies are monitored for changes using an observer system. For example when there is a local attribute dependency the dataset is monitored for any new items added to the dataset. It is also monitored for any calls to setCaseValues and checks if any of the dependent attributes' values are being changed.

Some formula adapters need to observe additional features to know when the formula should be recomputed. This is handled by the `setupFormulaObservers` method.
- the AttributeFormulaAdapter uses this to watch for changes to the collection hierarchy which is used by some formula methods.
- the FilterFormulaAdapter uses this to monitor the filter formula text itself.

Recomputation is performed by the adapter's `recalculateFormula` method, which updates the relevant cases in the dataset.

### Error Handling

- If a formula cannot be evaluated due to an error (such as a cycle or invalid reference), the error is set as the formula's output for all affected cases.
- Errors are surfaced to the user in the UI and stored in the dataset as the formula's value.

## Editor

The formula editor in CODAP is built on CodeMirror and is customized to provide a formula-friendly editing experience. Two key areas of customization are autocompletion and syntax highlighting.

### Autocompletion

Autocompletion is provided using CodeMirror's `@codemirror/autocomplete` package, with a custom completion source tailored for formulas:
- **Context-aware suggestions:** The editor suggests attribute names, constants (like `e`, `pi`, `π`), special variables (like `caseIndex`), boundaries, global values, and all available formula functions.
- **Custom apply logic:** For some completions, such as attribute names with special characters, the editor wraps the name in backticks. For functions, the completion inserts parentheses and places the caret inside them for immediate argument entry.
- **Dynamic options:** The set of completions can be configured via options, allowing the editor to show or hide categories like attributes, functions, or globals as needed.

### Syntax Highlighting

Syntax highlighting in the formula editor uses two main mechanisms:

- **Grammar-based Highlighting:**
  - The `formulaLanguageWithHighlighting` extension provides syntax highlighting based on a custom Lezer grammar for formulas. This grammar parses the formula text and assigns base highlight styles to different syntactic elements (such as numbers, operators, and identifiers) according to the structure of the formula language.

- **Contextual Highlighting with View Plugin:**
  - The `codapHighlightingViewPlugin` is a custom CodeMirror view plugin that traverses the parsed syntax tree and applies additional, context-sensitive CSS classes to specific formula elements. This plugin:
    - Distinguishes between attributes, functions, constants, boundaries, globals, and special variables by applying unique highlight classes (e.g., `codap-attribute`, `codap-function`).
    - Uses both the node type from the grammar and runtime context (such as the current dataset and available functions) to determine the correct style for each identifier.
    - Handles special cases, such as attribute names in backticks, and ensures that user-defined and system-defined elements are visually distinct.

## List of functions

The list of available functions occurs in two places in the code:
- `function-strings.json5`: this documents all of the functions including examples. It is used by the insert function button of the formula editor.
- `typedFnRegistry` which is exported by `math.ts`: this combines all of the function implementations which are located in files in the `src/models/formula/functions` folder. This is used to:
  - configure the autocomplete and highlight code in the formula editor.
  - configure the mathJs evaluator
  - handling specialized dependencies specific to certain functions
  - getting the formula dependencies
  - telling if a formula should be random
