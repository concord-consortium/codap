/**
 * A DataDisplayContentModel is a base model for GraphContentModel and MapContentModel.
 * It owns a vector of DataDisplayLayerModels.
 */
import {comparer, reaction} from "mobx"
import {addDisposer, Instance, types} from "mobx-state-tree"
import { format } from "d3"
import {TileContentModel} from "../../../models/tiles/tile-content"
import {IDataSet} from "../../../models/data/data-set"
import {ISharedCaseMetadata} from "../../../models/shared/shared-case-metadata"
import {ISharedDataSet} from "../../../models/shared/shared-data-set"
import {
  getAllTileCaseMetadata, getAllTileDataSets, getSharedDataSetFromDataSetId
} from "../../../models/shared/shared-data-utils"
import {DataDisplayLayerModelUnion} from "./data-display-layer-union"
import {DisplayItemDescriptionModel} from "./display-item-description-model"
import {GraphPlace} from "../../axis-graph-shared"
import { IDataConfigurationModel } from "./data-configuration-model"
import {defaultBackgroundColor} from "../../../utilities/color-utils"
import { MarqueeMode, PointDisplayTypes } from "../data-display-types"
import { IGetTipTextProps } from "../data-tip-types"
import { IAxisModel, isNumericAxisModel } from "../../axis/models/axis-model"

export const DataDisplayContentModel = TileContentModel
  .named("DataDisplayContentModel")
  .props({
    layers: types.array(DataDisplayLayerModelUnion),
    pointDescription: types.optional(DisplayItemDescriptionModel, () => DisplayItemDescriptionModel.create()),
    pointDisplayType: types.optional(types.enumeration([...PointDisplayTypes]), "points"),
    plotBackgroundColor: defaultBackgroundColor,
    isTransparent: false,
  })
  .volatile(() => ({
    animationEnabled: false,
    marqueeMode: 'unclicked' as MarqueeMode,
  }))
  .views(self => ({
    placeCanAcceptAttributeIDDrop(place: GraphPlace,
                             dataset: IDataSet | undefined,
                             attributeID: string | undefined): boolean {
      return false
    },
    hasDraggableNumericAxis(axisModel: IAxisModel): boolean {
      return isNumericAxisModel(axisModel) && self.pointDisplayType !== "bins"
    },
    hasHistogramAxis() {
      // derived models should override
      return false
    },
    histogramAxisTicks(): { tickValues: number[], tickLabels: string[] } {
      // derived models should override
      return {tickValues: [], tickLabels: []}
    },
    nonDraggableAxisTicks(formatter: (value: number) => string): { tickValues: number[], tickLabels: string[] } {
      // derived models should override
      return {tickValues: [], tickLabels: []}
    },
    get dataConfiguration(): IDataConfigurationModel | undefined {
      // derived models should override
      return undefined
    },
    get datasetsArray(): IDataSet[] {
      // derived models should override
      return []
    },
    caseTipText(attributeIDs: string[], caseID: string, dataset?: IDataSet) {
      const float = format('.3~f')
      const attrArray = (attributeIDs?.map(attrID => {
        const attribute = dataset?.attrFromID(attrID),
          name = attribute?.name,
          numValue = dataset?.getNumeric(caseID, attrID),
          value = numValue != null && isFinite(numValue) ? float(numValue)
            : dataset?.getValue(caseID, attrID)
        return value ? `${name}: ${value}` : ''
      }))
      // Caption attribute can also be one of the plotted attributes, so we remove dups and join into html string
      return Array.from(new Set(attrArray)).filter(anEntry => anEntry !== '').join('<br>')
    }
  }))
  .views(self => ({
    getTipText(props: IGetTipTextProps) {
      const { attributeIDs, caseID, dataset } = props
      // derived models may override in certain circumstances
      return self.caseTipText(attributeIDs, caseID, dataset)
    }
  }))
  .actions(self => ({
    startAnimation() {
      self.animationEnabled = true
      setTimeout(() => this.stopAnimation(), 2000)
    },
    stopAnimation() {
      self.animationEnabled = false
    },
    installSharedModelManagerSync() {
      // synchronizes shared model references from layers' DataConfigurations to the sharedModelManager
      addDisposer(self, reaction(
        () => {
          const layerDataSetIds = new Set<string>()
          const layerMetadataIds = new Set<string>()
          self.layers.forEach((layer, i) => {
            const sharedDataSet = getSharedDataSetFromDataSetId(self, layer.data?.id ?? "")
            if (sharedDataSet) layerDataSetIds.add(sharedDataSet.id)
            if (layer.metadata) layerMetadataIds.add(layer.metadata.id)
          })
          return { layerDataSetIds, layerMetadataIds }
        },
        ({ layerDataSetIds, layerMetadataIds }) => {
          const sharedModelManager = self.tileEnv?.sharedModelManager
          if (sharedModelManager) {
            // remove links to unconnected shared data sets
            getAllTileDataSets(self).forEach(sharedDataSet => {
              if (!layerDataSetIds.has(sharedDataSet.id)) {
                sharedModelManager.removeTileSharedModel(self, sharedDataSet)
              }
            })
            // add links to connected shared data sets
            layerDataSetIds.forEach(id => {
              const sharedDataSet = sharedModelManager.getSharedModelById<ISharedDataSet>(id)
              sharedDataSet && sharedModelManager.addTileSharedModel(self, sharedDataSet)
            })
            // remove links to unconnected shared case metadata
            getAllTileCaseMetadata(self).forEach(sharedMetadata => {
              if (!layerMetadataIds.has(sharedMetadata.id)) {
                sharedModelManager.removeTileSharedModel(self, sharedMetadata)
              }
            })
            // add links to connected shared metadata
            layerMetadataIds.forEach(id => {
              const sharedMetadata = sharedModelManager.getSharedModelById<ISharedCaseMetadata>(id)
              sharedMetadata && sharedModelManager.addTileSharedModel(self, sharedMetadata)
            })
          }
        }, {
          name: "DataDisplayContentModel.sharedModelManagerListener",
          equals: comparer.structural,
          fireImmediately: true
        }
      ))
    },
    setMarqueeMode(mode: MarqueeMode) {
      self.marqueeMode = mode
    }
  }))
export interface IDataDisplayContentModel extends Instance<typeof DataDisplayContentModel> {}
