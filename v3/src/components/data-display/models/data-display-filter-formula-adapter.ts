import { action, makeObservable, observable } from "mobx"
import { DEBUG_FORMULAS, debugLog } from "../../../lib/debug"
import { CaseList, IFormulaContext, IFormulaExtraMetadata } from "../../../models/formula/formula-manager-types"
import { IFormulaAdapterApi, FormulaManagerAdapter } from "../../../models/formula/formula-manager-adapter"
import { FormulaMathJsScope } from "../../../models/formula/formula-mathjs-scope"
import { math } from "../../../models/formula/functions/math"
import { formulaError } from "../../../models/formula/utils/misc"
import { ITileContentModel } from "../../../models/tiles/tile-content"
import { mstReaction } from "../../../utilities/mst-reaction"
import type { IDataDisplayContentModel } from "./data-display-content-model"

export interface IDataDisplayFilterFormulaExtraMetadata extends IFormulaExtraMetadata {
  contentModelId: string
}

export class DataDisplayFilterFormulaAdapter extends FormulaManagerAdapter {

  @observable.shallow contentModels = new Map<string, IDataDisplayContentModel>()

  constructor(type: string, api: IFormulaAdapterApi) {
    super(type, api)
    makeObservable(this)
  }

  isSuitableContentModel(contentModel: ITileContentModel): contentModel is IDataDisplayContentModel {
    return false
  }

  @action
  addContentModel(contentModel: ITileContentModel) {
    if (this.isSuitableContentModel(contentModel)) {
      this.contentModels.set(contentModel.id, contentModel)
    }
  }

  @action
  removeContentModel(contentModelId: string) {
    this.contentModels.delete(contentModelId)
  }

  getDataConfiguration(extraMetadata: IDataDisplayFilterFormulaExtraMetadata): any {
    // subclasses should override
    return {}
  }

  getContentModel(extraMetadata: IDataDisplayFilterFormulaExtraMetadata) {
    const { contentModelId } = extraMetadata
    const contentModel = this.contentModels.get(contentModelId)
    if (!contentModel) {
      throw new Error(`DataDisplayContentModel with id "${contentModelId}" not found`)
    }
    return contentModel
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IDataDisplayFilterFormulaExtraMetadata,
    casesToRecalculateDesc: CaseList = "ALL_CASES") {
    const dataConfig = this.getDataConfiguration(extraMetadata)

    if (formulaContext.formula.empty) {
      // if there is no filter formula, clear any filter results
      dataConfig?.updateFilterFormulaResults([], { replaceAll: true })
      return
    }

    // Clear any previous error first.
    this.setFormulaError(formulaContext, extraMetadata, "")

    if (!dataConfig) {
      throw new Error(`ContentModel with id "${extraMetadata.contentModelId}" not found`)
    }
    const results = this.computeFormula(formulaContext, extraMetadata, casesToRecalculateDesc)
    if (results && results.length > 0) {
      dataConfig.updateFilterFormulaResults(results, { replaceAll: casesToRecalculateDesc === "ALL_CASES" })
    }
  }

  computeFormula(formulaContext: IFormulaContext, extraMetadata: IDataDisplayFilterFormulaExtraMetadata,
    casesToRecalculateDesc: CaseList = "ALL_CASES") {
    const { formula, dataSet } = formulaContext
    const { attributeId } = extraMetadata
    const dataConfig = this.getDataConfiguration(extraMetadata)
    if (!dataConfig) {
      console.error(`ContentModel with id "${extraMetadata.contentModelId}" not found`)
      return
    }
    // Use visibleCaseIds to exclude hidden cases so they're not included in calculations,
    // such as aggregate functions like mean.
    const childMostCollectionCaseIds = [...dataConfig.visibleCaseIds]

    let casesToRecalculate: string[] = []
    if (casesToRecalculateDesc === "ALL_CASES") {
      // If casesToRecalculate is not provided, recalculate all cases.
      casesToRecalculate = childMostCollectionCaseIds
    } else {
      casesToRecalculate = casesToRecalculateDesc.map(c => c.__id__)
    }

    if (!casesToRecalculate || casesToRecalculate.length === 0) {
      return
    }

    debugLog(
      DEBUG_FORMULAS,
      `[filter formula] recalculate "${formula.canonical}" for ${casesToRecalculate.length} cases`
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
  setFormulaError(formulaContext: IFormulaContext, extraMetadata: IDataDisplayFilterFormulaExtraMetadata,
                  errorMsg: string) {
    const dataConfig = this.getDataConfiguration(extraMetadata)
    dataConfig?.setFilterFormulaError(errorMsg)
  }

  getFormulaError(formulaContext: IFormulaContext, extraMetadata: IDataDisplayFilterFormulaExtraMetadata) {
    // No custom errors yet.
    return undefined
  }

  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: IDataDisplayFilterFormulaExtraMetadata) {
    const contentModel = this.contentModels.get(extraMetadata.contentModelId)
    const disposer = contentModel && mstReaction(
                      () => contentModel?.dataConfiguration?.filterFormula?.display,
                      () => this.recalculateFormula(formulaContext, extraMetadata, "ALL_CASES"),
                      { name: "FilterFormulaAdapter.reaction" }, contentModel)
    return () => {
      // if there is no filter formula, clear any filter results
      contentModel?.dataConfiguration?.updateFilterFormulaResults([], { replaceAll: true })
      disposer?.()
    }
  }
}
