import { makeObservable } from "mobx"
import { IFormula } from "../../../models/formula/formula"
import { registerFormulaAdapter } from "../../../models/formula/formula-adapter-registry"
import {
  IFormulaAdapterApi, IFormulaContext, IFormulaManagerAdapter
} from "../../../models/formula/formula-manager-types"
import { mstReaction } from "../../../utilities/mst-reaction"
import { isFilterFormulaDataConfiguration } from "../../data-display/models/data-configuration-model"
import type { IGraphContentModel } from "./graph-content-model"
import { DataDisplayFilterFormulaAdapter, IDataDisplayFilterFormulaExtraMetadata }
    from "../../data-display/models/data-display-filter-formula-adapter"
import { kGraphTileType } from "../graph-defs"

export const GRAPH_FILTER_FORMULA_ADAPTER = "GraphFilterFormulaAdapter"

export interface IGraphFilterFormulaExtraMetadata extends IDataDisplayFilterFormulaExtraMetadata {
}

export class GraphFilterFormulaAdapter extends DataDisplayFilterFormulaAdapter implements IFormulaManagerAdapter {

  static register() {
    registerFormulaAdapter(api => new GraphFilterFormulaAdapter(api))
  }



  constructor(api: IFormulaAdapterApi) {
    super(GRAPH_FILTER_FORMULA_ADAPTER, api)
    makeObservable(this)
  }

  get graphContentModels() {
    const graphContentModels: IGraphContentModel[] = []
    // find all the map content models from the contentModels
    this.contentModels.forEach(contentModel => {
      if (contentModel.type === kGraphTileType) {
        graphContentModels.push(contentModel as IGraphContentModel)
      }
    }
    )
    return graphContentModels
  }

  getGraphContentModel(extraMetadata: IGraphFilterFormulaExtraMetadata) {
    const { contentModelId } = extraMetadata
    const graphContentModel = this.getContentModel(extraMetadata)
    if (!graphContentModel) {
      throw new Error(`GraphContentModel with id "${contentModelId}" not found`)
    }
    return graphContentModel
  }

  getDataConfiguration(extraMetadata: IGraphFilterFormulaExtraMetadata) {
    return this.getGraphContentModel(extraMetadata).dataConfiguration
  }

  getActiveFormulas(): ({ formula: IFormula, extraMetadata: IGraphFilterFormulaExtraMetadata })[] {
    const result: ({ formula: IFormula, extraMetadata: IGraphFilterFormulaExtraMetadata })[] = []
    this.graphContentModels.forEach(graphContentModel => {
      const dataConfig = graphContentModel.dataConfiguration
      const dataSet = graphContentModel.dataset
      if (dataSet && isFilterFormulaDataConfiguration(dataConfig)) {
        result.push({
          formula: dataConfig.filterFormula,
          extraMetadata: {
            dataSetId: dataSet.id,
            contentModelId: graphContentModel.id
          }
        })
      }
    })
    return result
  }


  // Error message is set as formula output, similarly as in CODAP V2.


  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: IGraphFilterFormulaExtraMetadata) {
    const graphContent = this.contentModels.get(extraMetadata.contentModelId)
    const dataConfig = this.getDataConfiguration(extraMetadata)
    const disposer = graphContent && mstReaction(
                      () => dataConfig?.filterFormula?.display,
                      () => this.recalculateFormula(formulaContext, extraMetadata, "ALL_CASES"),
                      { name: "GraphFilterFormulaAdapter.reaction" }, graphContent)
    return () => {
      // if there is no filter formula, clear any filter results
      dataConfig?.updateFilterFormulaResults([], { replaceAll: true })
      disposer?.()
    }
  }
}
