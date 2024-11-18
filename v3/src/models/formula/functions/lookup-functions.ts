import { isSymbolNode, MathNode } from "mathjs"
import { isBoundarySet, lookupBoundary } from "../../../utilities/boundary-utils"
import { t } from "../../../utilities/translation/translate"
import type { IDataSet } from "../../data/data-set"
import { CurrentScope, DisplayNameMap, FValue, ILookupDependency, LookupStringConstantArg } from "../formula-types"
import { isConstantStringNode } from "../utils/mathjs-utils"
import { basicCanonicalNameToDependency, rmCanonicalPrefix } from "../utils/name-mapping-utils"
import { UNDEF_RESULT, equal, evaluateNode, getRootScope } from "./function-utils"

export const lookupFunctions = {
  // lookupBoundary(boundary_set, boundary_key)
  lookupBoundary: {
    numOfRequiredArguments: 2,
    evaluateRaw: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
      const functionName = "lookupBoundary"
      const numOfReqArgs = lookupFunctions.lookupBoundary.numOfRequiredArguments
      if (args.length !== numOfReqArgs) {
        throw new Error(t("DG.Formula.FuncArgsErrorPlural.description", { vars: [ functionName, numOfReqArgs ] }))
      }

      // Find the boundary set
      if (!isSymbolNode(args[0])) throw new Error(t("DG.Formula.TypeError.message", { vars: [ "boundary_set" ] }))
      const boundarySetArg = args[0]
      const boundarySet = boundarySetArg?.name ?? ""
      if (!isBoundarySet(boundarySet)) {
        throw new Error(t("DG.Formula.VarReferenceError.message", { vars: [ boundarySet ] }))
      }

      // Find the boundary key
      let boundaryKey: string = ""
      if (isConstantStringNode(args[1])) {
        boundaryKey = args[1].value
      } else if (isSymbolNode(args[1])) {
        const symbol = basicCanonicalNameToDependency(args[1].name)
        if (!symbol) throw new Error(t("DG.Formula.VarReferenceError.message", { vars: [ args[1].name ] }))

        if (symbol.type === "localAttribute") {
          const attributeId = symbol.attrId
          const scope = getRootScope(currentScope)
          const dataset = scope.getLocalDataSet()
          dataset.validateCases()
          const attribute = dataset.getAttribute(attributeId)
          if (!attribute) throw new Error(t("DG.Formula.VarReferenceError.message", { vars: [ attributeId ] }))

          // The referenced attribute must be in the same or a parent collection--child collections are not allowed
          const attributeCollectionIndex =
            dataset.getCollectionIndex(dataset.getCollectionForAttribute(attribute.id)?.id)
          const thisCollectionIndex =
            Math.max(dataset.getCollectionIndex(dataset.getCollectionForCase(scope.caseId)?.id), 0)
          if (attributeCollectionIndex > thisCollectionIndex) {
            throw new Error(t("DG.Formula.HierReferenceError.message", { vars: [ attribute.title] }))
          }

          const aCase = dataset.caseInfoMap.get(scope.caseId)
          const caseIndex = dataset.getItemIndex(aCase?.childItemIds[0] ?? "")
          boundaryKey = attribute?.strValues[caseIndex ?? -1] ?? ""
        }
      }

      // Find the boundary
      const boundary = lookupBoundary(boundarySet, boundaryKey)
      return boundary ?? ""
    }
  },

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
    evaluateRaw: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
      const scope = getRootScope(currentScope)
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
        return dataSet.getValueAtItemIndex(zeroBasedIndex, attrId) || UNDEF_RESULT
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
    evaluateRaw: (args: MathNode[], mathjs: any, currentScope: CurrentScope) => {
      const scope = getRootScope(currentScope)
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
