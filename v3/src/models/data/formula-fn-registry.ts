import { create, all, isConstantNode, isSymbolNode } from 'mathjs'
import { getFormulaMathjsScope } from './formula-mathjs-scope'
import {
  ICODAPMathjsFunctionRegistry, ILookupByIndexDependency, ILookupByKeyDependency, isConstantStringNode
} from './formula-types'
import type { IDataSet } from './data-set'

export const math = create(all)

export const fnRegistry: ICODAPMathjsFunctionRegistry = {
  // lookupByIndex("dataSetName", "attributeName", index)
  lookupByIndex: {
    rawArgs: true,
    parseArguments: (args, { canonicalizeWith } = {}): ILookupByIndexDependency => {
      if (args.length !== 3) {
        throw new Error(`lookupByIndex function expects exactly 3 arguments, but it received ${args.length}`)
      }
      if (!isConstantStringNode(args[0]) || !isConstantStringNode(args[1]) || !isConstantNode(args[2])) {
        throw new Error("lookupByIndex function expects first two arguments to be strings " +
         "and the third one to be a number")
      }
      if (canonicalizeWith) {
        const dataSetName = args[0].value
        const attrName = args[1].value
        args[0].value = canonicalizeWith.dataSet[dataSetName]?.id
        args[1].value = canonicalizeWith.dataSet[dataSetName]?.attribute[attrName]
      }
      return {
        type: "lookupByIndex",
        dataSetId: args[0].value,
        attrId: args[1].value,
        index: args[2].value - 1 // zero based index
      }
    },
    evaluate: (args, mathjs, scope) => {
      const { dataSetId, attrId, index } = fnRegistry.lookupByIndex.parseArguments(args) as ILookupByIndexDependency
      return scope.get("dataSets")?.get(dataSetId)?.getValueAtIndex(index, attrId) || ""
    }
  },

  // lookupByKey("dataSetName", "attributeName", "keyAttributeName", "keyAttributeValue" | localKeyAttribute)
  lookupByKey: {
    rawArgs: true,
    parseArguments: (args, { canonicalizeWith } = {}) => {
      if (args.length !== 4) {
        throw new Error("lookupByKey function expects exactly 4 arguments")
      }
      if (!isConstantStringNode(args[0]) || !isConstantStringNode(args[1]) || !isConstantStringNode(args[2])) {
        throw new Error("lookupByKey function expects first three arguments to be strings")
      }
      if (!isConstantNode(args[3]) && !isSymbolNode(args[3])) {
        throw new Error("lookupByKey function expects the fourth argument to be a string or a symbol")
      }
      if (canonicalizeWith) {
        const dataSetName = args[0].value
        const attrName = args[1].value
        const keyAttrName = args[2].value
        args[0].value = canonicalizeWith.dataSet[dataSetName]?.id
        args[1].value = canonicalizeWith.dataSet[dataSetName]?.attribute[attrName]
        args[2].value = canonicalizeWith.dataSet[dataSetName]?.attribute[keyAttrName]
      }
      return {
        type: "lookupByKey",
        dataSetId: args[0].value,
        attrId: args[1].value,
        keyAttrId: args[2].value,
        keyAttrValue: isConstantNode(args[3]) ? args[3].value : undefined,
      }
    },
    evaluate: (args, mathjs, scope) => {
      const { dataSetId, attrId, keyAttrId, keyAttrValue } =
        fnRegistry.lookupByKey.parseArguments(args) as ILookupByKeyDependency

      const dataSet: IDataSet = scope.get("dataSets")?.get(dataSetId)
      if (!dataSet) {
        return ""
      }

      let finalKeyAttrValue = keyAttrValue
      if (finalKeyAttrValue === undefined) {
        // TODO: Mathjs recreates our scope as a Map, but at the same time it looses most of the functionality...
        // Recreate the custom scope here as a workaround. Check if there's no bug in mathjs, as our original scope
        // wasn't a Map, so I guess it should be still provided as an object (or its copy).
        const realScope = getFormulaMathjsScope(
          scope.get("localDataSet"), scope.get("dataSets"), scope.get("globalValueManager")
        )
        realScope.setCaseId(scope.get("caseId"))

        finalKeyAttrValue = args[3].compile().evaluate(realScope)
      }

      // TODO: is that the right way to access all the dataset cases?
      // TODO: Optimize? Sort and use binary search?
      for (const c of dataSet.cases) {
        const val = dataSet.getValue(c.__id__, keyAttrId)
        if (val === finalKeyAttrValue) {
          return dataSet.getValue(c.__id__, attrId) || ""
        }
      }
      return ""
    },
  }
}

// import the new function in the Mathjs namespace
Object.keys(fnRegistry).forEach((key) => {
  const fn = (fnRegistry as any)[key]
  if (fn.rawArgs) {
    // MathJS expects rawArgs property to be set on the evaluate function
    fn.evaluate.rawArgs = true
  }
  math.import({
    [key]: fn.evaluate
  })
})
