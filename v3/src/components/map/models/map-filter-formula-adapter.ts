import { makeObservable } from "mobx"
import { IAnyStateTreeNode } from "mobx-state-tree"
import { IFormula } from "../../../models/formula/formula"
import { registerFormulaAdapter } from "../../../models/formula/formula-adapter-registry"
import {
  IFormulaAdapterApi, IFormulaContext, IFormulaManagerAdapter
} from "../../../models/formula/formula-manager-types"
import { getFormulaManager } from "../../../models/tiles/tile-environment"
import { mstReaction } from "../../../utilities/mst-reaction"
import { isFilterFormulaDataConfiguration } from "../../data-display/models/data-configuration-model"
import {
  DataDisplayFilterFormulaAdapter, IDataDisplayFilterFormulaExtraMetadata
} from "../../data-display/models/data-display-filter-formula-adapter"
import { isMapContentModel, type IMapContentModel } from "./map-content-model"
import { ITileContentModel } from "../../../models/tiles/tile-content"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"

export const MAP_FILTER_FORMULA_ADAPTER = "MapFilterFormulaAdapter"

export interface IMapFilterFormulaExtraMetadata extends IDataDisplayFilterFormulaExtraMetadata {
  mapLayerId: string
}

export class MapFilterFormulaAdapter extends DataDisplayFilterFormulaAdapter implements IFormulaManagerAdapter {

  static register() {
    registerFormulaAdapter(api => new MapFilterFormulaAdapter(api))
  }

  static get(node?: IAnyStateTreeNode) {
    return getFormulaManager(node)?.adapters.find(({ type }) =>
      type === MAP_FILTER_FORMULA_ADAPTER
    ) as Maybe<MapFilterFormulaAdapter>
  }

  constructor(api: IFormulaAdapterApi) {
    super(MAP_FILTER_FORMULA_ADAPTER, api)
    makeObservable(this)
  }

  isSuitableContentModel(contentModel: ITileContentModel): contentModel is IDataDisplayContentModel {
    return isMapContentModel(contentModel)
  }

  get mapContentModels() {
    const mapContentModels: IMapContentModel[] = []
    // find all the map content models from the contentModels
    this.contentModels.forEach(contentModel => {
      if (isMapContentModel(contentModel)) {
        mapContentModels.push(contentModel)
      }
    })
    return mapContentModels
  }

  getMapLayer(extraMetadata: IMapFilterFormulaExtraMetadata) {
    const { mapLayerId } = extraMetadata
    const mapContentModel = this.getContentModel(extraMetadata)
    const mapLayer = mapContentModel.layers.find(l => l.id === mapLayerId)
    if (!mapLayer) {
      throw new Error(`MapLayer with id "${mapLayerId}" not found`)
    }
    return mapLayer
  }

  getDataConfiguration(extraMetadata: IMapFilterFormulaExtraMetadata) {
    const mapLayer = this.getMapLayer(extraMetadata)
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
              contentModelId: mapContentModel.id,
              mapLayerId: layer.id
            }
          })
        }
      })
    })

    return result
  }

  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: IMapFilterFormulaExtraMetadata) {
    const mapContent = this.contentModels.get(extraMetadata.contentModelId)
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
