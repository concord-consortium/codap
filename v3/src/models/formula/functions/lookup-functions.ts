import { ConstantNode, MathNode } from "mathjs"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { DisplayNameMap, ILookupDependency, isConstantStringNode, rmCanonicalPrefix } from "../formula-types"
import { UNDEF_RESULT, equal, evaluateNode } from "./function-utils"
import type { IDataSet } from "../../data/data-set"

export const lookupFunctions = {
  // lookupByIndex("dataSetName", "attributeName", index)
  lookupByIndex: {
    validateArguments: (args: MathNode[]): [ConstantNode<string>, ConstantNode<string>, MathNode] => {
      if (args.length !== 3) {
        throw new Error(`lookupByIndex function expects exactly 3 arguments, but it received ${args.length}`)
      }
      if (!isConstantStringNode(args[0]) || !isConstantStringNode(args[1])) {
        throw new Error("lookupByIndex function expects first two arguments to be strings " +
          "and the third one to be numeric (or evaluate to number)")
      }
      return [args[0], args[1], args[2]]
    },
    getDependency: (args: MathNode[]): ILookupDependency => {
      const validArgs = lookupFunctions.lookupByIndex.validateArguments(args)
      return {
        type: "lookup",
        dataSetId: rmCanonicalPrefix(validArgs[0].value),
        attrId: rmCanonicalPrefix(validArgs[1].value),
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const validArgs = lookupFunctions.lookupByIndex.validateArguments(args)
      const dataSetName = validArgs[0].value
      const attrName = validArgs[1].value
      validArgs[0].value = displayNameMap.dataSet[dataSetName]?.id
      validArgs[1].value = displayNameMap.dataSet[dataSetName]?.attribute[attrName]
    },
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const { dataSetId, attrId } = lookupFunctions.lookupByIndex.getDependency(args)
      const zeroBasedIndex = evaluateNode(args[2], scope) - 1
      return scope.getDataSet(dataSetId)?.getValueAtIndex(zeroBasedIndex, attrId) || UNDEF_RESULT
    }
  },

  // lookupByKey("dataSetName", "attributeName", "keyAttributeName", "keyAttributeValue" | localKeyAttribute)
  lookupByKey: {
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
    getDependency: (args: MathNode[]): Required<ILookupDependency> => {
      const validArgs = lookupFunctions.lookupByKey.validateArguments(args)
      return {
        type: "lookup",
        dataSetId: rmCanonicalPrefix(validArgs[0].value),
        attrId: rmCanonicalPrefix(validArgs[1].value),
        keyAttrId: rmCanonicalPrefix(validArgs[2].value),
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const validArgs = lookupFunctions.lookupByKey.validateArguments(args)
      const dataSetName = validArgs[0].value
      const attrName = validArgs[1].value
      const keyAttrName = validArgs[2].value
      validArgs[0].value = displayNameMap.dataSet[dataSetName]?.id
      validArgs[1].value = displayNameMap.dataSet[dataSetName]?.attribute[attrName]
      validArgs[2].value = displayNameMap.dataSet[dataSetName]?.attribute[keyAttrName]
    },
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const { dataSetId, attrId, keyAttrId } = lookupFunctions.lookupByKey.getDependency(args)
      const keyAttrValue = evaluateNode(args[3], scope)
      const dataSet: IDataSet | undefined = scope.getDataSet(dataSetId)
      if (!dataSet) {
        return UNDEF_RESULT
      }
      for (const c of dataSet.cases) {
        const val = dataSet.getValue(c.__id__, keyAttrId)
        if (equal(val, keyAttrValue)) {
          return dataSet.getValue(c.__id__, attrId) || UNDEF_RESULT
        }
      }
      return UNDEF_RESULT
    },
  },
}
