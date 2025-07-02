import { DEBUG_FORMULAS, debugLog } from "../../lib/debug"
import { mstReaction } from "../../utilities/mst-reaction"
import { isFilterFormulaDataSet } from "../data/data-set"
import { ICase } from "../data/data-set-types"
import { IFormula } from "./formula"
import { registerFormulaAdapter } from "./formula-adapter-registry"
import { type IFormulaContext, type IFormulaExtraMetadata } from "./formula-manager-types"
import { FormulaManagerAdapter, type IFormulaAdapterApi } from "./formula-manager-adapter"
import { FormulaMathJsScope } from "./formula-mathjs-scope"
import { math } from "./functions/math"
import { formulaError } from "./utils/misc"

const FILTER_FORMULA_ADAPTER = "FilterFormulaAdapter"

export class FilterFormulaAdapter extends FormulaManagerAdapter {

  static register() {
    registerFormulaAdapter(api => new FilterFormulaAdapter(api))
  }

  constructor(api: IFormulaAdapterApi) {
    super(FILTER_FORMULA_ADAPTER, api)
  }

  getActiveFormulas(): ({ formula: IFormula, extraMetadata: IFormulaExtraMetadata })[] {
    const result: ({ formula: IFormula, extraMetadata: IFormulaExtraMetadata })[] = []
    this.api.getDatasets().forEach(dataSet => {
      if (isFilterFormulaDataSet(dataSet)) {
        result.push({
          formula: dataSet.filterFormula,
          extraMetadata: {
            dataSetId: dataSet.id
          }
        })
      }
    })
    return result
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IFormulaExtraMetadata,
    casesToRecalculateDesc: ICase[] | "ALL_CASES" = "ALL_CASES") {

    const dataSet = this.api.getDatasets().get(extraMetadata.dataSetId)

    if (formulaContext.formula.empty) {
      // if there is no filter formula, clear any filter results
      dataSet?.updateFilterFormulaResults([], { replaceAll: true })
      return
    }

    // Clear any previous error first.
    this.setFormulaError(formulaContext, extraMetadata, "")

    if (!dataSet) {
      throw new Error(`Dataset with id "${extraMetadata.dataSetId}" not found`)
    }
    const results = this.computeFormula(formulaContext, extraMetadata, casesToRecalculateDesc)
    if (results && results.length > 0) {
      dataSet.updateFilterFormulaResults(results, { replaceAll: casesToRecalculateDesc === "ALL_CASES" })
    }
  }

  computeFormula(formulaContext: IFormulaContext, extraMetadata: IFormulaExtraMetadata,
    casesToRecalculateDesc: ICase[] | "ALL_CASES" = "ALL_CASES") {
    const { formula, dataSet } = formulaContext
    const { attributeId } = extraMetadata

    // Use itemsNotSetAside to exclude set-aside cases so they're not included in calculations,
    // such as aggregate functions like mean.
    const childMostCollectionCaseIds =
      dataSet.itemsNotSetAside.map(id => dataSet.getItem(id)).filter(c => c).map(c => c?.__id__) as string[]

    let casesToRecalculate: string[] = []
    if (casesToRecalculateDesc === "ALL_CASES") {
      // If casesToRecalculate is not provided, recalculate all cases.
      casesToRecalculate = childMostCollectionCaseIds
    } else {
      casesToRecalculate = casesToRecalculateDesc.map(c => {
        return dataSet.caseInfoMap.get(c.__id__)?.childItemIds || c.__id__
      }).filter(c => c).flat()
    }
    if (!casesToRecalculate || casesToRecalculate.length === 0) {
      return
    }

    debugLog(
      DEBUG_FORMULAS,
      `[dataset filter formula] recalculate "${formula.canonical}" for ${casesToRecalculate.length} cases`
    )

    const formulaScope = new FormulaMathJsScope({
      localDataSet: dataSet,
      dataSets: this.api.getDatasets(),
      globalValueManager: this.api.getGlobalValueManager(),
      formulaAttrId: attributeId,
      caseIds: casesToRecalculate,
      childMostCollectionCaseIds
    })

    try {
      const compiledFormula = math.compile(formula.canonical)
      return casesToRecalculate.map((c, idx) => {
        formulaScope.setCasePointer(idx)
        const formulaValue = compiledFormula.evaluate(formulaScope)
        // This is necessary for functions like `prev` that need to know the previous result when they reference
        // its own attribute.
        formulaScope.savePreviousResult(formulaValue)
        return {
          itemId: c,
          result: !!formulaValue // only boolean values are supported
        }
      })
    } catch (e: any) {
      return this.setFormulaError(formulaContext, extraMetadata, formulaError(e.message))
    }
  }

  // Error message is set as formula output, similarly as in CODAP V2.
  setFormulaError(formulaContext: IFormulaContext, extraMetadata: IFormulaExtraMetadata, errorMsg: string) {
    const { dataSet } = formulaContext
    dataSet.setFilterFormulaError(errorMsg)
  }

  getFormulaError(formulaContext: IFormulaContext, extraMetadata: IFormulaExtraMetadata) {
    // No custom errors yet.
    return undefined
  }

  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: IFormulaExtraMetadata) {
    const { dataSet } = formulaContext
    const disposer = dataSet && mstReaction(
                      () => dataSet.filterFormula?.display,
                      () => this.recalculateFormula(formulaContext, extraMetadata, "ALL_CASES"),
                      { name: "FilterFormulaAdapter.reaction" }, dataSet)
    return () => {
      // if there is no filter formula, clear any filter results
      dataSet?.updateFilterFormulaResults([], { replaceAll: true })
      disposer?.()
    }
  }
}
