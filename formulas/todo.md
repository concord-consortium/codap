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

Things to fix:
- dataset context: formula components are using the dataset context to access the dataset. I think that could be fixed by adding the dataset to the formula context.
- global value manager needs some kind of registration of context so CODAP and CLUE can provide their own implementations to the formulas package
- the scss files should not be processed, just copied to dist, so then when the v3 package bundles the dependencies it will process these scss files and update the imports appropriately.

# Type issues
The formula IDataSet type and its sub types cannot be assigned a CODAP IDataSet.

This is because both types (and subtypes) define methods which take themselves or their subtypes. So for example there is a method `IFormulaManagerAdapter.recalculateFormula` which takes a `IFormulaContext`. This context refers to the IDataSet. So typescript is trying to prevent a formula IDataSet from being passed into the CODAP `IFormulaManagerAdapter.recalculateFormula`.

Another example where this can be a problem is with an array property. The push method of an array needs to get items of the same type as the array. So the attributes array on a dataset needs to make sure it is only getting attributes of the same type. The push method can be worked around by saying the formula type only needs a "readonly" array. But then the next problem is the "concat" method of arrays. The concat method also needs an array of the same type.

This is confusing because the array in the formula types should be fine if it has a mix of formula items (which are a "super" type of the CODAP items). However when a CODAP type is passed into a function, typescript wants to make sure this function can call methods on the CODAP instance with incompatible parameters. So this causes a "reverse" assignment error. In other words instead of trying to assign a CODAP type to a formula type, we are now assigning a formula type to a CODAP type. And this reverse assignment is what is incompatible.

These problems are currently fixed by casting the dataset.

It should be possible to address these problems by using generics. As long as we can say the datSet of the formula context is the same one that it is related to, and that this dataset extends the formula IDataSet then typescript should be allow this, and it will be type safe.
