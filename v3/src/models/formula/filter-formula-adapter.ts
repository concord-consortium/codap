import { math } from "./functions/math"
import { FormulaMathJsScope } from "./formula-mathjs-scope"
import { formulaError } from "./utils/misc"
import { ICase } from "../data/data-set-types"
import { IFormula } from "./formula"
import type {
  IFormulaAdapterApi, IFormulaContext, IFormulaExtraMetadata, IFormulaManagerAdapter
} from "./formula-manager"
import { DEBUG_FORMULAS, debugLog } from "../../lib/debug"
import { isFilterFormulaDataSet } from "../data/data-set"

const FILTER_FORMULA_ADAPTER = "FilterFormulaAdapter"

export class FilterFormulaAdapter implements IFormulaManagerAdapter {
  type = FILTER_FORMULA_ADAPTER
  api: IFormulaAdapterApi

  constructor(api: IFormulaAdapterApi) {
    this.api = api
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
    if (formulaContext.formula.empty) {
      return
    }

    // Clear any previous error first.
    this.setFormulaError(formulaContext, extraMetadata, "")

    const dataSet = this.api.getDatasets().get(extraMetadata.dataSetId)
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

    let casesToRecalculate: ICase[] = []
    if (casesToRecalculateDesc === "ALL_CASES") {
      // If casesToRecalculate is not provided, recalculate all cases.
      // Use itemsNotSetAside to exclude set-aside cases so they're not included in calculations,
      // such as aggregate functions like mean.
      casesToRecalculate = dataSet.itemsNotSetAside.map(id => dataSet.getItem(id)).filter(c => c) as ICase[]
    } else {
      casesToRecalculate = casesToRecalculateDesc
    }
    if (!casesToRecalculate || casesToRecalculate.length === 0) {
      return
    }

    const caseIds = casesToRecalculate.map(c => c.__id__)

    debugLog(DEBUG_FORMULAS, `[attr formula] recalculate "${formula.canonical}" for ${casesToRecalculate.length} cases`)

    const formulaScope = new FormulaMathJsScope({
      localDataSet: dataSet,
      dataSets: this.api.getDatasets(),
      globalValueManager: this.api.getGlobalValueManager(),
      formulaAttrId: attributeId,
      caseIds,
      childMostCollectionCaseIds: caseIds
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
          itemId: c.__id__,
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
}
