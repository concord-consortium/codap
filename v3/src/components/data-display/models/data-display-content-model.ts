/**
 * A DataDisplayContentModel is a base model for GraphContentModel and MapContentModel.
 * It owns a vector of DataDisplayLayerModels.
 */
import {comparer, reaction} from "mobx"
import {addDisposer, Instance, SnapshotIn, types} from "mobx-state-tree"
import { format } from "d3"
import { formatDate } from "../../../utilities/date-utils"
import { IValueType } from "../../../models/data/attribute-types"
import { IAttribute } from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {IDataSetMetadata} from "../../../models/shared/data-set-metadata"
import {ISharedDataSet} from "../../../models/shared/shared-data-set"
import { getAllTileCaseMetadata, getAllTileDataSets } from "../../../models/shared/shared-data-tile-utils"
import { getSharedDataSetFromDataSetId } from "../../../models/shared/shared-data-utils"
import {TileContentModel} from "../../../models/tiles/tile-content"
import { getTileContentInfo } from "../../../models/tiles/tile-content-info"
import {defaultBackgroundColor} from "../../../utilities/color-utils"
import { typeV3Id } from "../../../utilities/codap-utils"
import { AxisPlace, IAxisTicks, TickFormatter } from "../../axis/axis-types"
import {GraphPlace} from "../../axis-graph-shared"
import { IAxisModel } from "../../axis/models/axis-model"
import { isAnyNumericAxisModel } from "../../axis/models/numeric-axis-models"
import { MarqueeMode } from "../data-display-types"
import { IGetTipTextProps, IShowDataTipProps } from "../data-tip-types"
import { IDataConfigurationModel } from "./data-configuration-model"
import {DataDisplayLayerModelUnion} from "./data-display-layer-union"
import {DisplayItemDescriptionModel} from "./display-item-description-model"
import { IBaseDataDisplayModel } from "./base-data-display-content-model"
import { DataDisplayRenderState } from "./data-display-render-state"

export type BackgroundLockInfo = {
  locked: true,
  xAxisLowerBound: number,
  xAxisUpperBound: number,
  yAxisLowerBound: number,
  yAxisUpperBound: number
}

export const DataDisplayContentModel = TileContentModel
  .named("DataDisplayContentModel")
  .props({
    // expected to be overridden by derived models
    id: typeV3Id("DDCM"),
    layers: types.array(DataDisplayLayerModelUnion),
    pointDescription: types.optional(DisplayItemDescriptionModel, () => DisplayItemDescriptionModel.create()),
    // The following five properties apply to graphs, not maps, but need to be accessible at this level
    plotBackgroundColor: defaultBackgroundColor,
    plotBackgroundOpacity: 1,
    isTransparent: false,
    plotBackgroundImage: types.maybe(types.string),
    plotBackgroundImageLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
  })
  .volatile(() => ({
    animationTimerId: 0,
    marqueeMode: 'unclicked' as MarqueeMode,
    renderState: undefined as DataDisplayRenderState | undefined,
    showDataTip: (props: IShowDataTipProps) => {},
    hideDataTip: (event: PointerEvent) => {}
  }))
  .views(self => ({
    placeCanAcceptAttributeIDDrop(place: GraphPlace,
                             dataset: IDataSet | undefined,
                             attributeID: string | undefined): boolean {
      return false
    },
    hasDraggableNumericAxis(axisModel: IAxisModel): boolean {
      // derived models may override to provide additional constraints
      return isAnyNumericAxisModel(axisModel)
    },
    nonDraggableAxisTicks(formatter: TickFormatter): IAxisTicks {
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
    get formulaAdapters() {
      return getTileContentInfo(self.type)?.getFormulaAdapters?.(self) ?? []
    },
    caseTipText(attributeIDs: string[], caseID: string, dataset?: IDataSet) {

      const getValueToDisplay = (numValue: number | undefined, value: IValueType, attribute?: IAttribute) => {
        if (!attribute) return ''
        switch (attribute.type) {
          case 'numeric': {
            const numPrecision = attribute.numPrecision
            const showUnits = attribute.units && attribute.units !== ""
            const unitsString = showUnits ? ` ${attribute.units}` : ""
            if (numValue && isFinite(numValue) && numPrecision) {
              const formatStr = `.${attribute.numPrecision}~f`
              const formatter = format(formatStr)
              return `${formatter ? `${formatter(numValue)}` : `${numValue}`}${unitsString}`
            }
            return `${value}${unitsString}`
          }
          case 'date': {
            const datePrecision = attribute.datePrecision
            return value && datePrecision ? formatDate(String(value), datePrecision) : value
          }
          default:
            return value
        }
      }

      const float = format('.3~f')
      const attrArray = (attributeIDs?.map(attrID => {
        const attribute = dataset?.attrFromID(attrID),
          name = attribute?.name,
          numValue = dataset?.getNumeric(caseID, attrID),
          value = numValue != null && isFinite(numValue) ? float(numValue)
            : dataset?.getValue(caseID, attrID),
          displayedValue = getValueToDisplay(numValue, value, attribute)
        return value ? `${name}: ${displayedValue}` : ''
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
    },
    getAxis(place: AxisPlace): IAxisModel | undefined {
      // derived models should override if they have axes
      return undefined
    },
  }))
  .actions(self => ({
    beforeDestroy() {
      if (self.animationTimerId) {
        clearTimeout(self.animationTimerId)
      }
    },
    startAnimation(onComplete?: () => void) {
      if (self.animationTimerId) clearTimeout(self.animationTimerId)
      self.animationTimerId = window.setTimeout(() => {
        this.stopAnimation()
        onComplete?.()
      }, 2000)
    },
    stopAnimation() {
      self.animationTimerId = 0
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
              const sharedMetadata = sharedModelManager.getSharedModelById<IDataSetMetadata>(id)
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
    },
    setRenderState(renderState: DataDisplayRenderState) {
      self.renderState = renderState
    },
    setShowDataTip: (showDataTip: (props: IShowDataTipProps) => void) => {
      self.showDataTip = showDataTip
    },
    setHideDataTip: (hideDataTip: (event: PointerEvent) => void) => {
      self.hideDataTip = hideDataTip
    }
  }))
export interface IDataDisplayContentModel extends Instance<typeof DataDisplayContentModel> {}
export interface IDataDisplayContentModelSnapshotIn extends SnapshotIn<typeof DataDisplayContentModel> {}

export function isDataDisplayContentModel(model?: IBaseDataDisplayModel): model is IDataDisplayContentModel {
  // Currently checking for any type is enough to ensure this is a IDataDisplayContentModel
  return !!model?.type
}
