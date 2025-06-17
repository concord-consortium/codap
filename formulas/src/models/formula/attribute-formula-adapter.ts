import { EvalFunction } from "mathjs"
import { DEBUG_FORMULAS, debugLog } from "../../lib/debug"
import { boundaryManager } from "../boundaries/boundary-manager"
import { isFormulaAttr, isValidFormulaAttr } from "../data/attribute"
import { CaseInfo, ICase, IGroupedCase, symParent } from "../data/data-set-types"
import { IFormula } from "./formula"
import { registerFormulaAdapter } from "./formula-adapter-registry"
import { IFormulaContext, IFormulaExtraMetadata, CaseList } from "./formula-manager-types"
import { IFormulaAdapterApi, FormulaManagerAdapter } from "./formula-manager-adapter"
import { FormulaMathJsScope, NO_PARENT_KEY } from "./formula-mathjs-scope"
import { observeDatasetHierarchyChanges } from "./formula-observers"
import { FValue, ILocalAttributeDependency, ILookupDependency } from "./formula-types"
import { math } from "./functions/math"
import {
  getFormulaChildMostAggregateCollectionIndex, getIncorrectChildAttrReference, getIncorrectParentAttrReference
} from "./utils/collection-utils"
import { getFormulaDependencies } from "./utils/formula-dependency-utils"
import { formulaError } from "./utils/misc"

const ATTRIBUTE_FORMULA_ADAPTER = "AttributeFormulaAdapter"

interface IAttrFormulaExtraMetadata extends IFormulaExtraMetadata {
  attributeId: string
  boundariesLoaded?: boolean
}

export class AttributeFormulaAdapter extends FormulaManagerAdapter {

  static register() {
    registerFormulaAdapter(api => new AttributeFormulaAdapter(api))
  }

  constructor(api: IFormulaAdapterApi) {
    super(ATTRIBUTE_FORMULA_ADAPTER, api)
  }

  getActiveFormulas(): ({ formula: IFormula, extraMetadata: IAttrFormulaExtraMetadata })[] {
    const result: ({ formula: IFormula, extraMetadata: IAttrFormulaExtraMetadata })[] = []
    this.api.getDatasets().forEach(dataSet => {
      dataSet.attributes.forEach(attr => {
        if (isFormulaAttr(attr)) {
          result.push({
            formula: attr.formula,
            extraMetadata: {
              dataSetId: dataSet.id,
              attributeId: attr.id,
              boundariesLoaded: boundaryManager.boundariesLoaded
            }
          })
        }
      })
    })
    return result
  }

  getCaseGroupMap(formulaContext: IFormulaContext, extraMetadata: IAttrFormulaExtraMetadata) {
    const { dataSet } = formulaContext
    const { attributeId } = extraMetadata

    const collectionId = dataSet.getCollectionForAttribute(attributeId)?.id
    const collectionIndex = dataSet.getCollectionIndex(collectionId || "")
    const caseGroupId: Record<string, string> = {}

    const processCase = (c: IGroupedCase) => {
      const parentId = c[symParent] || NO_PARENT_KEY
      caseGroupId[c.__id__] = caseGroupId[parentId] || parentId
    }

    const calculateChildCollectionGroups = () => {
      // process children of requested collection
      for (let i = collectionIndex + 1; i < dataSet.collections.length; i++) {
        dataSet.collections[i].cases.forEach(aCase => processCase(aCase))
      }
    }

    const calculateSameLevelGroups = () => {
      const formulaCollection = dataSet.collections[collectionIndex]
      formulaCollection?.caseGroups.forEach((group: CaseInfo) => processCase(group.groupedCase))
    }

    // Note that order of execution of these functions is critical. First, we need to calculate child collection groups,
    // as child collection cases are grouped using the pseudo cases from the collection where the formula attribute is.
    // Next, we can calculate grouping for the formula attribute collection (same-level grouping). These will be parents
    // of the formula attribute collection cases. If we reversed the order, the child collection cases would be
    // grouped incorrectly (using a collection too high in the collections hierarchy).
    calculateChildCollectionGroups()
    calculateSameLevelGroups()

    return caseGroupId
  }

  getCaseChildrenCountMap(formulaContext: IFormulaContext, formulaExtraMetadata: IAttrFormulaExtraMetadata) {
    const { dataSet } = formulaContext
    const { attributeId } = formulaExtraMetadata

    const collectionId = dataSet.getCollectionForAttribute(attributeId)?.id
    const collectionIndex = dataSet.getCollectionIndex(collectionId)
    const caseChildrenCount: Record<string, number> = {}

    const formulaCollection = dataSet.collections[collectionIndex]
    if (formulaCollection) {
      formulaCollection.caseGroups.forEach((group: CaseInfo) =>
        caseChildrenCount[group.groupedCase.__id__] =
          group.childCaseIds ? group.childCaseIds.length : group.childItemIds.length
      )
    }

    return caseChildrenCount
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IAttrFormulaExtraMetadata,
    casesToRecalculateDesc: ICase[] | "ALL_CASES" = "ALL_CASES") {
    if (formulaContext.formula.empty) {
      // Do nothing. Recalculating of empty formula would erase dataset values.
      return
    }

    const dataSet = this.api.getDatasets().get(extraMetadata.dataSetId)
    if (!dataSet) {
      throw new Error(`Dataset with id "${extraMetadata.dataSetId}" not found`)
    }
    const results = this.computeFormula(formulaContext, extraMetadata, casesToRecalculateDesc)
    if (results && results.length > 0) {
      dataSet.setCaseValues(results)
    }
  }

  computeFormula(formulaContext: IFormulaContext, extraMetadata: IAttrFormulaExtraMetadata,
    casesToRecalculateDesc: ICase[] | "ALL_CASES" = "ALL_CASES") {
    const { formula, dataSet } = formulaContext
    const { attributeId } = extraMetadata

    let casesToRecalculate: ICase[] = []
    if (casesToRecalculateDesc === "ALL_CASES") {
      // When casesToRecalculate is not provided, recalculate all cases.
      casesToRecalculate = dataSet.getCasesForAttributes([attributeId])
    } else {
      casesToRecalculate = casesToRecalculateDesc
    }
    if (!casesToRecalculate || casesToRecalculate.length === 0) {
      return
    }

    debugLog(DEBUG_FORMULAS,
            `[attr formula] recalculate "${formula.canonical}" for ${casesToRecalculate.length} cases`)

    const collectionId = dataSet.getCollectionForAttribute(attributeId)?.id
    const collectionIndex = dataSet.getCollectionIndex(collectionId || "")

    const incorrectParentAttrId = getIncorrectParentAttrReference(formula.canonical, collectionIndex, dataSet)
    if (incorrectParentAttrId) {
      const attrName = dataSet.attrFromID(incorrectParentAttrId)?.name || ""
      return this.setFormulaError(formulaContext, extraMetadata,
        formulaError("V3.formula.error.invalidParentAttrRef", [ attrName ]))
    }

    const incorrectChildAttrId = getIncorrectChildAttrReference(formula.canonical, collectionIndex, dataSet)
    if (incorrectChildAttrId) {
      const attrName = dataSet.attrFromID(incorrectChildAttrId)?.name || ""
      return this.setFormulaError(formulaContext, extraMetadata,
        formulaError("DG.Formula.HierReferenceError.message", [ attrName ]))
    }

    const childMostAggregateCollectionIndex =
      getFormulaChildMostAggregateCollectionIndex(formula.canonical, dataSet) ?? collectionIndex
    const childMostCollectionCaseIds = dataSet.collections[childMostAggregateCollectionIndex].caseIds

    const formulaScope = new FormulaMathJsScope({
      localDataSet: dataSet,
      dataSets: this.api.getDatasets(),
      boundaryManager: this.api.getBoundaryManager(),
      globalValueManager: this.api.getGlobalValueManager(),
      formulaAttrId: attributeId,
      formulaCollectionIndex: collectionIndex,
      childMostAggregateCollectionIndex,
      caseIds: casesToRecalculate.map(c => c.__id__),
      childMostCollectionCaseIds,
      caseGroupId: this.getCaseGroupMap(formulaContext, extraMetadata),
      caseChildrenCount: this.getCaseChildrenCountMap(formulaContext, extraMetadata)
    })

    let compiledFormula: EvalFunction
    try {
      compiledFormula = math.compile(formula.canonical)
    } catch (e: any) {
      return this.setFormulaError(formulaContext, extraMetadata, formulaError(e.message))
    }

    return casesToRecalculate.map((c, idx) => {
      formulaScope.setCasePointer(idx)
      let formulaValue: FValue
      try {
        formulaValue = compiledFormula.evaluate(formulaScope)
        // This is necessary for functions like `prev` that need to know the previous result when they reference
        // its own attribute.
        formulaScope.savePreviousResult(formulaValue)
      } catch (e: any) {
        formulaValue = formulaError(e.message)
      }
      return {
        __id__: c.__id__,
        [attributeId]: formulaValue
      }
    })
  }

  // Error message is set as formula output, similarly as in CODAP V2.
  setFormulaError(formulaContext: IFormulaContext, extraMetadata: IAttrFormulaExtraMetadata, errorMsg: string) {
    const { dataSet } = formulaContext
    const { attributeId } = extraMetadata
    const allCases = dataSet.getCasesForAttributes([attributeId])
    dataSet.setCaseValues(allCases.map(c => ({
      __id__: c.__id__,
      [attributeId]: errorMsg
    })))
  }

  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: IAttrFormulaExtraMetadata) {
    const { dataSet } = formulaContext
    return observeDatasetHierarchyChanges(dataSet, (casesToRecalculate?: CaseList) => {
      this.recalculateFormula(formulaContext, extraMetadata, casesToRecalculate)
    })
  }

  getFormulaError(formulaContext: IFormulaContext, extraMetadata: IAttrFormulaExtraMetadata) {
    if (this.isDependencyCyclePresent(formulaContext, extraMetadata)) {
      return formulaError("V3.formula.error.cycle")
    }
  }

  // Simple DFS (depth first search) algorithm to detect dependency cycles.
  isDependencyCyclePresent(formulaContext: IFormulaContext, extraMetadata: IAttrFormulaExtraMetadata) {
    const dataSets = this.api.getDatasets()

    const visitedFormulas: Record<string, boolean> = {}
    const stack: string[] = [formulaContext.formula.id]

    while (stack.length > 0) {
      const currentFormula = stack.pop() as string

      if (visitedFormulas[currentFormula]) {
        return true // cycle detected
      }
      visitedFormulas[currentFormula] = true

      const { formula, dataSet } = this.api.getFormulaContext(currentFormula)
      const { attributeId } = this.api.getFormulaExtraMetadata(currentFormula)
      const formulaDependencies = getFormulaDependencies(formula.canonical, attributeId)

      const localDatasetAttributeDependencies: ILocalAttributeDependency[] =
        formulaDependencies.filter(d => d.type === "localAttribute")
      for (const dependency of localDatasetAttributeDependencies) {
        const dependencyAttribute = dataSet.attrFromID(dependency.attrId)
        if (isValidFormulaAttr(dependencyAttribute)) {
          stack.push(dependencyAttribute.formula.id)
        }
      }

      const lookupDependencies: ILookupDependency[] =
        formulaDependencies.filter(d => d.type === "lookup")
      for (const dependency of lookupDependencies) {
        const externalDataSet = dataSets.get(dependency.dataSetId)
        const dependencyAttribute = externalDataSet?.attrFromID(dependency.attrId)
        if (isValidFormulaAttr(dependencyAttribute)) {
          stack.push(dependencyAttribute.formula.id)
        }
        if (dependency.otherAttrId) {
          const dependencyOtherAttribute = externalDataSet?.attrFromID(dependency.otherAttrId)
          if (isValidFormulaAttr(dependencyOtherAttribute)) {
            stack.push(dependencyOtherAttribute.formula.id)
          }
        }
      }
    }
    return false // no cycle detected
  }
}
