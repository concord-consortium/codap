import { create, all, isConstantNode, MathNode, mean, ConstantNode } from 'mathjs'
import { getFormulaMathjsScope } from './formula-mathjs-scope'
import {
  DisplayNameMap, ICODAPMathjsFunctionRegistry, ILookupByIndexDependency, ILookupByKeyDependency,
  MathJSShallowCopyOfScope, isConstantStringNode
} from './formula-types'
import type { IDataSet } from './data-set'

export const math = create(all)

const evaluateNode = (node: MathNode, scope?: MathJSShallowCopyOfScope) => {
  // TODO: Mathjs recreates our scope as a Map, but at the same time it looses most of the functionality...
  // Recreate the custom scope here as a workaround. Check if there's no bug in mathjs, as our original scope
  // wasn't a Map, so I guess it should be still provided as an object (or its copy).
  const realScope = !scope ? undefined : getFormulaMathjsScope(
    scope.get("localDataSet"), scope.get("dataSets"), scope.get("globalValueManager")
  )
  if (scope && realScope) {
    realScope.setCaseId(scope.get("caseId"))
  }
  return node.compile().evaluate(realScope)
}

export const fnRegistry = {
  // equal(a, b) or a == b
  // Note that we need to overwrite default MathJs implementation so we can compare strings like "ABC" == "CDE".
  // MathJs doesn't allow that by default, as it assumes that equal operator can be used only with numbers.
  equal: {
    rawArgs: false,
    isAggregate: false,
    evaluate: (a: any, b: any) => {
      if (Array.isArray(a) && Array.isArray(b)) {
        return a.map((v, i) => v === b[i])
      }
      if (Array.isArray(a) && !Array.isArray(b)) {
        return a.map((v) => v === b)
      }
      if (!Array.isArray(a) && Array.isArray(b)) {
        return b.map((v) => v === a)
      }
      return a === b
    }
  },

  // lookupByIndex("dataSetName", "attributeName", index)
  lookupByIndex: {
    rawArgs: true,
    isAggregate: false,
    validateArguments: (args: MathNode[]): [ConstantNode<string>, ConstantNode<string>, ConstantNode<number>] => {
      if (args.length !== 3) {
        throw new Error(`lookupByIndex function expects exactly 3 arguments, but it received ${args.length}`)
      }
      // TODO: remove index from dependency! It's not necessarily a constant, it might be dynamically calculated.
      if (!isConstantStringNode(args[0]) || !isConstantStringNode(args[1]) || !isConstantNode(args[2])) {
        throw new Error("lookupByIndex function expects first two arguments to be strings " +
          "and the third one to be a number")
      }
      return [args[0], args[1], args[2]]
    },
    getDependency: (args: MathNode[]): ILookupByIndexDependency => {
      const validArgs = fnRegistry.lookupByIndex.validateArguments(args)
      return {
        type: "lookupByIndex",
        dataSetId: validArgs[0].value,
        attrId: validArgs[1].value,
        // TODO: remove index from dependency! It's not necessarily a constant, it might be dynamically calculated.
        index: validArgs[2].value - 1 // zero based index
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const validArgs = fnRegistry.lookupByIndex.validateArguments(args)
      const dataSetName = validArgs[0].value
      const attrName = validArgs[1].value
      validArgs[0].value = displayNameMap.dataSet[dataSetName]?.id
      validArgs[1].value = displayNameMap.dataSet[dataSetName]?.attribute[attrName]
    },
    evaluate: (args: MathNode[], mathjs: any, scope: MathJSShallowCopyOfScope) => {
      const dataSetId = evaluateNode(args[0], scope)
      const attrId = evaluateNode(args[1], scope)
      const zeroBasedIndex = evaluateNode(args[2], scope) - 1
      return scope.get("dataSets")?.get(dataSetId)?.getValueAtIndex(zeroBasedIndex, attrId) || ""
    }
  },

  // lookupByKey("dataSetName", "attributeName", "keyAttributeName", "keyAttributeValue" | localKeyAttribute)
  lookupByKey: {
    rawArgs: true,
    isAggregate: false,
    validateArguments: (args: MathNode[]):
      [ConstantNode<string>, ConstantNode<string>, ConstantNode<string>, MathNode] => {
      if (args.length !== 4) {
        throw new Error("lookupByKey function expects exactly 4 arguments")
      }
      if (!isConstantStringNode(args[0]) || !isConstantStringNode(args[1]) || !isConstantStringNode(args[2])) {
        throw new Error("lookupByKey function expects first three arguments to be strings")
      }
      return [args[0], args[1], args[2], args[3]]
    },
    getDependency: (args: MathNode[]): ILookupByKeyDependency => {
      const validArgs = fnRegistry.lookupByKey.validateArguments(args)
      return {
        type: "lookupByKey",
        dataSetId: validArgs[0].value,
        attrId: validArgs[1].value,
        keyAttrId: validArgs[2].value,
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const validArgs = fnRegistry.lookupByKey.validateArguments(args)
      const dataSetName = validArgs[0].value
      const attrName = validArgs[1].value
      const keyAttrName = validArgs[2].value
      validArgs[0].value = displayNameMap.dataSet[dataSetName]?.id
      validArgs[1].value = displayNameMap.dataSet[dataSetName]?.attribute[attrName]
      validArgs[2].value = displayNameMap.dataSet[dataSetName]?.attribute[keyAttrName]
    },
    evaluate: (args: MathNode[], mathjs: any, scope: MathJSShallowCopyOfScope) => {
      const dataSetId = evaluateNode(args[0], scope)
      const attrId = evaluateNode(args[1], scope)
      const keyAttrId = evaluateNode(args[2], scope)
      const keyAttrValue = evaluateNode(args[3], scope)

      const dataSet: IDataSet = scope.get("dataSets")?.get(dataSetId)
      if (!dataSet) {
        return ""
      }
      // TODO: is that the right way to access all the dataset cases?
      // TODO: Optimize? Sort and use binary search?
      for (const c of dataSet.cases) {
        const val = dataSet.getValue(c.__id__, keyAttrId)
        if (val === keyAttrValue) {
          return dataSet.getValue(c.__id__, attrId) || ""
        }
      }
      return ""
    },
  },

  // mean(expression, filterExpression)
  mean: {
    rawArgs: true,
    isAggregate: true,
    evaluate: (args: MathNode[], mathjs: any, scope: MathJSShallowCopyOfScope) => {
      const expression = args[0]
      const filter = args[1]
      let expressionValues = evaluateNode(expression, scope)
      if (filter) {
        const filterValues = evaluateNode(filter, scope)
        expressionValues = expressionValues.filter((v: any, i: number) => !!filterValues[i])
      }
      return mean(expressionValues)
    }
  },
}

export const typedFnRegistry: ICODAPMathjsFunctionRegistry & typeof fnRegistry = fnRegistry

// import the new function in the Mathjs namespace
Object.keys(fnRegistry).forEach((key) => {
  const fn = (fnRegistry as any)[key]
  if (fn.rawArgs) {
    // MathJS expects rawArgs property to be set on the evaluate function
    fn.evaluate.rawArgs = true
  }
  math.import({
    [key]: fn.evaluate
  }, {
    override: true // override functions already defined by mathjs
  })
})
