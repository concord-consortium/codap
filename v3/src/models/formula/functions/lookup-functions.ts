import { ConstantNode, MathNode } from "mathjs"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { DisplayNameMap, FValue, ILookupDependency } from "../formula-types"
import { rmCanonicalPrefix } from "../utils/name-mapping-utils"
import { UNDEF_RESULT, equal, evaluateNode } from "./function-utils"
import { isConstantStringNode } from "../utils/mathjs-utils"
import { t } from "../../../utilities/translation/translate"
import type { IDataSet } from "../../data/data-set"

type LookupStringConstantArg = ConstantNode<string> | undefined

export const lookupFunctions = {
  // lookupByIndex("dataSetName", "attributeName", index)
  lookupByIndex: {
    numOfRequiredArguments: 3,
    getDependency: (args: MathNode[]): ILookupDependency => {
      const [dataSetNameArg, attrNameArg] = args as LookupStringConstantArg[]
      return {
        type: "lookup",
        dataSetId: rmCanonicalPrefix(dataSetNameArg?.value),
        attrId: rmCanonicalPrefix(attrNameArg?.value),
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const [dataSetNameArg, attrNameArg] = args as LookupStringConstantArg[]
      const dataSetName = dataSetNameArg?.value || ""
      const attrName = attrNameArg?.value || ""
      if (dataSetNameArg) {
        dataSetNameArg.value = displayNameMap.dataSet[dataSetName]?.id || dataSetName
      }
      if (attrNameArg) {
        attrNameArg.value = displayNameMap.dataSet[dataSetName]?.attribute[attrName] || attrName
      }
    },
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const functionName = "lookupByIndex"
      const numOfReqArgs = lookupFunctions.lookupByIndex.numOfRequiredArguments
      if (args.length !== numOfReqArgs) {
        throw new Error(t("DG.Formula.FuncArgsErrorPlural.description", { vars: [ functionName, numOfReqArgs ] }))
      }
      [0, 1].forEach(i => {
        if (!isConstantStringNode(args[i])) {
          throw new Error(t("V3.formula.error.stringConstantArg", { vars: [ functionName, i + 1 ] }))
        }
      })
      const { dataSetId, attrId } = lookupFunctions.lookupByIndex.getDependency(args)
      const indexArg = evaluateNode(args[2], scope)
      const dataSet = scope.getDataSet(dataSetId)
      if (!dataSet) {
        throw new Error(t("DG.Formula.LookupDataSetError.description", { vars: [ dataSetId ] }))
      }
      if (!dataSet.attrFromID(attrId)) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ attrId, dataSet.name || "" ] }))
      }
      // lookupByIndex can be executed in aggregate context, so we need to handle array arguments.
      const fn = (index: number) => {
        const zeroBasedIndex = index - 1
        return dataSet.getValueAtIndex(zeroBasedIndex, attrId) || UNDEF_RESULT
      }
      if (Array.isArray(indexArg)) {
        return indexArg.map(fn)
      }
      return fn(indexArg)
    }
  },

  // lookupByKey("dataSetName", "attributeName", "keyAttributeName", "keyAttributeValue" | localKeyAttribute)
  lookupByKey: {
    numOfRequiredArguments: 4,
    getDependency: (args: MathNode[]): Required<ILookupDependency> => {
      const [dataSetNameArg, attrNameArg, keyAttrNameArg] = args as LookupStringConstantArg[]
      return {
        type: "lookup",
        dataSetId: rmCanonicalPrefix(dataSetNameArg?.value),
        attrId: rmCanonicalPrefix(attrNameArg?.value),
        keyAttrId: rmCanonicalPrefix(keyAttrNameArg?.value)
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const [dataSetNameArg, attrNameArg, keyAttrNameArg] = args as LookupStringConstantArg[]
      const dataSetName = dataSetNameArg?.value || ""
      const attrName = attrNameArg?.value || ""
      const keyAttrName = keyAttrNameArg?.value || ""
      if (dataSetNameArg) {
        dataSetNameArg.value = displayNameMap.dataSet[dataSetName]?.id || dataSetName
      }
      if (attrNameArg) {
        attrNameArg.value = displayNameMap.dataSet[dataSetName]?.attribute[attrName] || attrName
      }
      if (keyAttrNameArg) {
        keyAttrNameArg.value = displayNameMap.dataSet[dataSetName]?.attribute[keyAttrName] || keyAttrName
      }
    },
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const functionName = "lookupByKey"
      const numOfReqArgs = lookupFunctions.lookupByKey.numOfRequiredArguments
      if (args.length !== numOfReqArgs) {
        throw new Error(t("DG.Formula.FuncArgsErrorPlural.description", { vars: [ functionName, numOfReqArgs ] }))
      }
      [0, 1, 2].forEach(i => {
        if (!isConstantStringNode(args[i])) {
          throw new Error(t("V3.formula.error.stringConstantArg", { vars: [ functionName, i + 1 ] }))
        }
      })
      const { dataSetId, attrId, keyAttrId } = lookupFunctions.lookupByKey.getDependency(args)
      const keyAttrValueArg = evaluateNode(args[3], scope)
      const dataSet: IDataSet | undefined = scope.getDataSet(dataSetId)
      if (!dataSet) {
        throw new Error(t("DG.Formula.LookupDataSetError.description", { vars: [ dataSetId ] }))
      }
      if (!dataSet.attrFromID(attrId)) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ attrId, dataSet.name || "" ] }))
      }
      if (!dataSet.attrFromID(keyAttrId)) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ keyAttrId, dataSet.name || "" ] }))
      }
      // lookupByKey can be executed in aggregate context, so we need to handle array arguments.
      const fn = (keyAttrValue: FValue) => {
        for (const c of dataSet.items) {
          const val = dataSet.getValue(c.__id__, keyAttrId)
          if (equal(val, keyAttrValue)) {
            return dataSet.getValue(c.__id__, attrId) || UNDEF_RESULT
          }
        }
        return UNDEF_RESULT
      }
      if (Array.isArray(keyAttrValueArg)) {
        return keyAttrValueArg.map(fn)
      }
      return fn(keyAttrValueArg)
    },
  },
}
