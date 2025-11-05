import { isSymbolNode, MathNode } from "mathjs"
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
      const scope = getRootScope(currentScope)
      const numOfReqArgs = lookupFunctions.lookupBoundary.numOfRequiredArguments
      if (args.length !== numOfReqArgs) {
        throw new Error(t("DG.Formula.FuncArgsErrorPlural.description", { vars: [ functionName, numOfReqArgs ] }))
      }
      const [boundarySetArg, boundaryKeyArg] = args

      // Find the boundary set
      if (!isSymbolNode(boundarySetArg)) {
        throw new Error(t("DG.Formula.TypeError.message", { vars: [ "boundary_set" ] }))
      }
      const boundaryManager = scope.context.boundaryManager
      const boundarySet = evaluateNode(boundarySetArg, scope)
      if (!boundaryManager?.isBoundarySet(boundarySet)) {
        throw new Error(t("DG.Formula.VarReferenceError.message", { vars: [ boundarySet ] }))
      }

      // Find the boundary key
      let boundaryKey: string = ""
      if (isConstantStringNode(boundaryKeyArg)) {
        boundaryKey = boundaryKeyArg.value
      } else if (isSymbolNode(boundaryKeyArg)) {
        const symbol = basicCanonicalNameToDependency(boundaryKeyArg.name)
        if (!symbol) throw new Error(t("DG.Formula.VarReferenceError.message", { vars: [ boundaryKeyArg.name ] }))

        if (symbol.type === "localAttribute") {
          const attributeId = symbol.attrId
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
      else {
        boundaryKey = evaluateNode(boundaryKeyArg, scope)
      }

      if (boundaryManager.isBoundaryDataPending(boundarySet)) {
        return t("DG.Formula.PendingBoundaries.message")
      }

      if (boundaryManager.hasBoundaryDataError(boundarySet)) {
        return t("DG.Formula.FailedBoundaries.message", { vars: [boundarySet] })
      }

      // Find the boundary
      return boundaryManager.getBoundaryData(boundarySet, boundaryKey) ?? ""
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
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ attrId, dataSet.title || "" ] }))
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
        otherAttrId: rmCanonicalPrefix(keyAttrNameArg?.value)
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
      const { dataSetId, attrId, otherAttrId } = lookupFunctions.lookupByKey.getDependency(args)
      const keyAttrValueArg = evaluateNode(args[3], scope)
      const dataSet: IDataSet | undefined = scope.getDataSet(dataSetId)
      if (!dataSet) {
        throw new Error(t("DG.Formula.LookupDataSetError.description", { vars: [ dataSetId ] }))
      }
      if (!dataSet.attrFromID(attrId)) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ attrId, dataSet.title || "" ] }))
      }
      if (!dataSet.attrFromID(otherAttrId)) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ otherAttrId, dataSet.title || "" ] }))
      }
      // lookupByKey can be executed in aggregate context, so we need to handle array arguments.
      const fn = (keyAttrValue: FValue) => {
        for (const c of dataSet.items) {
          const val = dataSet.getValue(c.__id__, otherAttrId)
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
