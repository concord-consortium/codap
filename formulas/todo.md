Files referencing formula system:
- app.tsx - attribute-formula-adapter, filter-formula-adapter
- formula-editor.tx - functions/math, lezer/formula-language
- data-configuration-model.ts - formula
- data-display-filter-formula-adapter.ts - formula-manager-adapter, formula-mathjs-scope, functions/math, utils/misc
- plotted-function-adornment-model.ts - formula, functions/math, utils/misc
- plotted-value-adornment-model.ts -  formula, formula-adapter-registry, functions/math, utils/misc
- base-graph-formula-adapter.ts - formula-manager-adapter, formula-mathjs-scope, name-mapping-utils
- graph-filter-formula-adapter.ts - formula-adapter-registry
- bar-chart-formula-adapter.ts - formula-adapter-registry, utils/misc, functions/math
- bar-chart-model.ts - formula
- map-filter-formula-adapter.ts - formula-adapter-registry
- formula-engine-handler.ts - functions/math
- resource-parser-utils.ts - formula-mathjs-scope, functions/math, utils/canonicalization-utils, name-mapping-utils
- attribute.ts - formula
- data-set.ts - formula
- create-document-model.ts - formula-adapter-registry, formula-manager

Files "symlinked":
- attribute-formula-adapter
- filter-formula-adapter
- formula-adapter-registry
- formula-manager-adapter
- formula-manager-types
- formula-manager
- formula-mathjs-scope
- functions/function-utils
- math.ts
- utils/name-mapping-utils.ts
- formula.ts
- formula-types.ts

# Generics

In theory we could use generics so it wouldn't be necessary to cast CODAP's IDataSet to the formula library's IDataSet before passing it to the formulas library's functions. See the "Types Issues" section to understand why this is necessary. While using generics seems possible, it seems to require a lot of nested generics through out pretty much all of the library.

## Issues

A relatively simple change is to use change FormulaManager to `FormulaManager<HostDataSet extends IDataSet>`. Doing this will cascade into several files:
- formula-manager-types.ts
- formula-manager-adapter.ts
- formula-adapter-registry.ts
- filter-formula-adapter.ts
- attribute-formula-adapter.ts

Additionally in the filter-formula-register it is necessary to make a registry class, and let the host (CODAP or CLUE) create an instance of this registry class which is now typed to use that host's dataset type.

This approach is pretty simple and doesn't involve too many changes. However when CODAP tries to create this typed registry, we end up right back at the same type issues before. Specifically when CODAP calls `new FormulaAdapterRegistry<IDataSet>()`, typescript will complain that CODAP's IDataSet is not assignable to the formulas library's IDataSet. This is because of the attributes and collections arrays and other methods which can be passed a attribute or collection.

These issues can in theory be fixed by parameterizing the formula IDataSet type itself, something like `IDataSet<HostCollection extends ICollection, HostAttribute extends IAttribute>`. But that means that all references to IDataSet in the formula library have to be updated to use this definition correctly. It isn't clear how to then use that parameterized dataset with the various classes and types that needed. For example `class FilterFormulaAdapter<HostDataSet extends IDataSet>`, we have to provide types for HostCollection and HostAttribute.

## Files in CODAP that use casts
The following CODAP files were updated to cast the host dataset to the formula dataset.
  - case-table-tool-shelf-button.tsx
  - plotted-function-formula-adapter.test.ts
  - plotted-value-formula-adapter.test.ts
  - data-context-handler.ts
  - create-document-model.ts
  - formula-test-utils.ts

These cast the host global value manager to the formula global value manager:
  - resource-parser-utils.ts
  - create-codap-document.ts
  - document-content.ts
  - formula-test-utils.ts

# Things to fix:
- mathjs-utils.ts
- string-utils.ts
- the scss files should not be processed, just copied to dist, so then when the v3 package bundles the dependencies it will process these scss files and update the imports appropriately.

# Type issues
The formula IDataSet type and its sub types cannot be assigned a CODAP IDataSet.

This is because both types (and subtypes) define methods which take themselves or their subtypes. So for example there is a method `IFormulaManagerAdapter.recalculateFormula` which takes a `IFormulaContext`. This context refers to the IDataSet. So typescript is trying to prevent a formula IDataSet from being passed into the CODAP `IFormulaManagerAdapter.recalculateFormula`.

Another example where this can be a problem is with an array property. The push method of an array needs to get items of the same type as the array. So the attributes array on a dataset needs to make sure it is only getting attributes of the same type. The push method can be worked around by saying the formula type only needs a "readonly" array. But then the next problem is the "concat" method of arrays. The concat method also needs an array of the same type.

This is confusing because the array in the formula types should be fine if it has a mix of formula items (which are a "super" type of the CODAP items). However when a CODAP type is passed into a function, typescript wants to make sure this function can call methods on the CODAP instance with incompatible parameters. So this causes a "reverse" assignment error. In other words instead of trying to assign a CODAP type to a formula type, we are now assigning a formula type to a CODAP type. And this reverse assignment is what is incompatible.

These problems are currently fixed by casting the dataset.

It should be possible to address these problems by using generics. As long as we can say the datSet of the formula context is the same one that it is related to, and that this dataset extends the formula IDataSet then typescript should be allow this, and it will be type safe.
