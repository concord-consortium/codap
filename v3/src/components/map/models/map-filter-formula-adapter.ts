import { action, makeObservable, observable } from "mobx"
import { IAnyStateTreeNode } from "mobx-state-tree"
import { DEBUG_FORMULAS, debugLog } from "../../../lib/debug"
import { ICase } from "../../../models/data/data-set-types"
import { IFormula } from "../../../models/formula/formula"
import { registerFormulaAdapter } from "../../../models/formula/formula-adapter-registry"
import {
  FormulaManagerAdapter, IFormulaAdapterApi, IFormulaContext, IFormulaExtraMetadata, IFormulaManagerAdapter
} from "../../../models/formula/formula-manager-types"
import { FormulaMathJsScope } from "../../../models/formula/formula-mathjs-scope"
import { math } from "../../../models/formula/functions/math"
import { formulaError } from "../../../models/formula/utils/misc"
import { getFormulaManager } from "../../../models/tiles/tile-environment"
import { mstReaction } from "../../../utilities/mst-reaction"
import { isFilterFormulaDataConfiguration } from "../../data-display/models/data-configuration-model"
import type { IMapContentModel } from "./map-content-model"

const MAP_FILTER_FORMULA_ADAPTER = "MapFilterFormulaAdapter"

export interface IMapFilterFormulaExtraMetadata extends IFormulaExtraMetadata {
  mapContentModelId: string
  mapLayerId: string
}

export class MapFilterFormulaAdapter extends FormulaManagerAdapter implements IFormulaManagerAdapter {

  static register() {
    registerFormulaAdapter(api => new MapFilterFormulaAdapter(api))
  }

  static get(node?: IAnyStateTreeNode) {
    return getFormulaManager(node)?.adapters.find(({ type }) =>
      type === MAP_FILTER_FORMULA_ADAPTER
    ) as Maybe<MapFilterFormulaAdapter>
  }

  @observable.shallow mapContentModels = new Map<string, IMapContentModel>()

  constructor(api: IFormulaAdapterApi) {
    super(MAP_FILTER_FORMULA_ADAPTER, api)
    makeObservable(this)
  }

  @action
  addMapContentModel(mapContentModel: IMapContentModel) {
    this.mapContentModels.set(mapContentModel.id, mapContentModel)
  }

  @action
  removeMapContentModel(mapContentModelId: string) {
    this.mapContentModels.delete(mapContentModelId)
  }

  getMapContentModel(extraMetadata: IMapFilterFormulaExtraMetadata) {
    const { mapContentModelId } = extraMetadata
    const mapContentModel = this.mapContentModels.get(mapContentModelId)
    if (!mapContentModel) {
      throw new Error(`MapContentModel with id "${mapContentModelId}" not found`)
    }
    return mapContentModel
  }

  getDataConfiguration(extraMetadata: IMapFilterFormulaExtraMetadata) {
    const contentModel = this.getMapContentModel(extraMetadata)
    const mapLayer = contentModel.layers.find(l => l.id === extraMetadata.mapLayerId)
    return mapLayer?.dataConfiguration
  }

  getActiveFormulas(): ({ formula: IFormula, extraMetadata: IMapFilterFormulaExtraMetadata })[] {
    const result: ({ formula: IFormula, extraMetadata: IMapFilterFormulaExtraMetadata })[] = []
    this.mapContentModels.forEach(mapContentModel => {
      mapContentModel.layers.forEach(layer => {
        const dataConfig = layer.dataConfiguration
        const dataSet = dataConfig?.dataset
        if (dataSet && isFilterFormulaDataConfiguration(dataConfig)) {
          result.push({
            formula: dataConfig.filterFormula,
            extraMetadata: {
              dataSetId: dataSet.id,
              mapContentModelId: mapContentModel.id,
              mapLayerId: layer.id
            }
          })
        }
      })
    })

    return result
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IMapFilterFormulaExtraMetadata,
    casesToRecalculateDesc: ICase[] | "ALL_CASES" = "ALL_CASES") {
    const dataConfig = this.getDataConfiguration(extraMetadata)
    if (formulaContext.formula.empty) {
      // if there is no filter formula, clear any filter results
      dataConfig?.updateFilterFormulaResults([], { replaceAll: true })
      return
    }

    // Clear any previous error first.
    this.setFormulaError(formulaContext, extraMetadata, "")

    if (!dataConfig) {
      throw new Error(`MapContentModel with id "${extraMetadata.mapContentModelId}" not found`)
    }
    const results = this.computeFormula(formulaContext, extraMetadata, casesToRecalculateDesc)
    if (results && results.length > 0) {
      dataConfig.updateFilterFormulaResults(results, { replaceAll: casesToRecalculateDesc === "ALL_CASES" })
    }
  }

  computeFormula(formulaContext: IFormulaContext, extraMetadata: IMapFilterFormulaExtraMetadata,
    casesToRecalculateDesc: ICase[] | "ALL_CASES" = "ALL_CASES") {
    const { formula, dataSet } = formulaContext
    const { attributeId } = extraMetadata
    const dataConfig = this.getDataConfiguration(extraMetadata)
    // Use visibleCaseIds to exclude hidden cases so they're not included in calculations,
    // such as aggregate functions like mean.
    const childMostCollectionCaseIds = dataConfig ? [...dataConfig.visibleCaseIds] : []

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
      `[map filter formula] recalculate "${formula.canonical}" for ${casesToRecalculate.length} cases`
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
  setFormulaError(formulaContext: IFormulaContext, extraMetadata: IMapFilterFormulaExtraMetadata, errorMsg: string) {
    const dataConfig = this.getDataConfiguration(extraMetadata)
    dataConfig?.setFilterFormulaError(errorMsg)
  }

  getFormulaError(formulaContext: IFormulaContext, extraMetadata: IMapFilterFormulaExtraMetadata) {
    // No custom errors yet.
    return undefined
  }

  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: IMapFilterFormulaExtraMetadata) {
    const mapContent = this.mapContentModels.get(extraMetadata.mapContentModelId)
    const dataConfig = this.getDataConfiguration(extraMetadata)
    const disposer = mapContent && mstReaction(
                      () => dataConfig?.filterFormula?.display,
                      () => this.recalculateFormula(formulaContext, extraMetadata, "ALL_CASES"),
                      { name: "MapFilterFormulaAdapter.reaction" }, mapContent)
    return () => {
      // if there is no filter formula, clear any filter results
      dataConfig?.updateFilterFormulaResults([], { replaceAll: true })
      disposer?.()
    }
  }
}