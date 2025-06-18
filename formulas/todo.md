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

Things to fix:
- dataset context: formula components are using the dataset context to access the dataset. I think that could be fixed by adding the dataset to the formula context.
- global value manager needs some kind of registration of context so CODAP and CLUE can provide their own implementations to the formulas package
- the scss files should not be processed, just copied to dist, so then when the v3 package bundles the dependencies it will process these scss files and update the imports appropriately.
