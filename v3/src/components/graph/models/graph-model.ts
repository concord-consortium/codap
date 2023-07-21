import {reaction} from "mobx"
import {addDisposer, Instance, ISerializedActionCall, SnapshotIn, types} from "mobx-state-tree"
import {createContext, useContext} from "react"
import { AdornmentModelUnion, IAdornmentModel, IUpdateCategoriesOptions } from "../adornments/adornment-models"
import {AxisPlace} from "../../axis/axis-types"
import {AxisModelUnion, EmptyAxisModel, IAxisModelUnion} from "../../axis/models/axis-model"
import {kGraphTileType} from "../graph-defs"
import {
  GraphAttrRole, hoverRadiusFactor, PlotType, PlotTypes,
  pointRadiusLogBase, pointRadiusMax, pointRadiusMin, pointRadiusSelectionAddend
} from "../graphing-types"
import {DataConfigurationModel} from "./data-configuration-model"
import {
  ISharedDataSet, isSharedDataSet, kSharedDataSetType, SharedDataSet
} from "../../../models/shared/shared-data-set"
import {
  getDataSetFromId, getTileCaseMetadata, getTileDataSet, isTileLinkedToDataSet, linkTileToDataSet
} from "../../../models/shared/shared-data-utils"
import {ISharedModel} from "../../../models/shared/shared-model"
import {SharedModelChangeType} from "../../../models/shared/shared-model-manager"
import {ITileContentModel, TileContentModel} from "../../../models/tiles/tile-content"
import {
  defaultBackgroundColor, defaultPointColor, defaultStrokeColor, kellyColors
} from "../../../utilities/color-utils"
import { onAnyAction } from "../../../utilities/mst-utils"

export interface GraphProperties {
  axes: Record<string, IAxisModelUnion>
  plotType: PlotType
}

export type BackgroundLockInfo = {
  locked: true,
  xAxisLowerBound: number,
  xAxisUpperBound: number,
  yAxisLowerBound: number,
  yAxisUpperBound: number
}

export const NumberToggleModel = types
  .model('NumberToggleModel', {})

export const GraphModel = TileContentModel
  .named("GraphModel")
  .props({
    type: types.optional(types.literal(kGraphTileType), kGraphTileType),
    adornments: types.array(AdornmentModelUnion),
    // keys are AxisPlaces
    axes: types.map(AxisModelUnion),
    // TODO: should the default plot be something like "nullPlot" (which doesn't exist yet)?
    plotType: types.optional(types.enumeration([...PlotTypes]), "casePlot"),
    config: types.optional(DataConfigurationModel, () => DataConfigurationModel.create()),
    // Visual properties
    _pointColors: types.optional(types.array(types.string), [defaultPointColor]),
    _pointStrokeColor: defaultStrokeColor,
    pointStrokeSameAsFill: false,
    plotBackgroundColor: defaultBackgroundColor,
    pointSizeMultiplier: 1,
    isTransparent: false,
    plotBackgroundImageID: "",
    // todo: how to use this type?
    plotBackgroundLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
    // numberToggleModel: types.optional(types.union(NumberToggleModel, null))
    showParentToggles: false,
    showMeasuresForSelection: false
  })
  .volatile(self => ({
    prevDataSetId: "",
    disposeDataSetListener: undefined as (() => void) | undefined
  }))
  .views(self => ({
    get data() {
      return getTileDataSet(self)
    },
    get metadata() {
      return getTileCaseMetadata(self)
    },
    pointColorAtIndex(plotIndex = 0) {
      return self._pointColors[plotIndex] ?? kellyColors[plotIndex % kellyColors.length]
    },
    get pointColor() {
      return this.pointColorAtIndex(0)
    },
    get pointStrokeColor() {
      return self.pointStrokeSameAsFill ? this.pointColor : self._pointStrokeColor
    },
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    },
    getAttributeID(place: GraphAttrRole) {
      return self.config.attributeID(place) ?? ''
    },
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      let r = pointRadiusMax
      const numPoints = self.config.caseDataArray.length
      // for loop is fast equivalent to radius = max( minSize, maxSize - floor( log( logBase, max( dataLength, 1 )))
      for (let i = pointRadiusLogBase; i <= numPoints; i = i * pointRadiusLogBase) {
        --r
        if (r <= pointRadiusMin) break
      }
      const result = r * self.pointSizeMultiplier
      switch (use) {
        case "normal":
          return result
        case "hover-drag":
          return result * hoverRadiusFactor
        case "select":
          return result + pointRadiusSelectionAddend
      }
    },
    axisShouldShowGridLines(place: AxisPlace) {
      return self.plotType === 'scatterPlot' && ['left', 'bottom'].includes(place)
    }
  }))
  .views(self => ({
    getUpdateCategoriesOptions(resetPoints=false): IUpdateCategoriesOptions {
      return {
        xAxis: self.getAxis("bottom"),
        yAxis: self.getAxis("left"),
        xCategories: self.config.categoryArrayForAttrRole("topSplit", []) ?? [],
        yCategories: self.config.categoryArrayForAttrRole("rightSplit", []) ?? [],
        resetPoints
      }
    }
  }))
  .actions(self => ({
    setDataSetListener() {
      const actionsAffectingCategories = [
        "addCases", "removeAttribute", "removeCases", "setCaseValues"
      ]
      self.disposeDataSetListener?.()
      self.disposeDataSetListener = self.data
        ? onAnyAction(self.data, action => {
            // TODO: check whether categories have actually changed before updating
            if (actionsAffectingCategories.includes(action.name)) {
              this.updateAdornments()
            }
          })
        : undefined
    },
    updateAdornments(resetPoints=false) {
      const options = self.getUpdateCategoriesOptions(resetPoints)
      self.adornments.forEach(adornment => adornment.updateCategories(options))
    }
  }))
  .actions(self => ({
    afterAttachToDocument() {
      // Monitor our parents and update our shared model when we have a document parent
      addDisposer(self, reaction(() => {
        const sharedModelManager = self.tileEnv?.sharedModelManager

        const sharedDataSets: ISharedDataSet[] = sharedModelManager?.isReady
          ? sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
          : []

        const tileSharedModels = sharedModelManager?.isReady
          ? sharedModelManager?.getTileSharedModels(self)
          : undefined

        return { sharedModelManager, sharedDataSets, tileSharedModels }
      },
      // reaction/effect
      ({sharedModelManager, sharedDataSets, tileSharedModels}) => {
        if (!sharedModelManager?.isReady) {
          // We aren't added to a document yet so we can't do anything yet
          return
        }

        const tileDataSet = getTileDataSet(self)
        if (self.data || self.metadata) {
          self.config.setDataset(self.data, self.metadata)
        }
        // auto-link to DataSet if we aren't currently linked and there's only one available
        else if (!tileDataSet && sharedDataSets.length === 1) {
          linkTileToDataSet(self, sharedDataSets[0].dataSet)
        }
      },
      {name: "GraphModel.sharedModelSetup", fireImmediately: true}))
    },
    beforeDestroy() {
      self.disposeDataSetListener?.()
    },
    updateAfterSharedModelChanges(sharedModel: ISharedModel | undefined, type: SharedModelChangeType) {
      if (type === "link") {
        self.config.setDataset(self.data, self.metadata)
      }
      else if (type === "unlink" && isSharedDataSet(sharedModel)) {
        self.config.setDataset(undefined, undefined)
      }
      const currDataSetId = self.data?.id ?? ""
      if (self.prevDataSetId !== currDataSetId) {
        self.setDataSetListener()
        self.prevDataSetId = currDataSetId
      }
    },
    setAxis(place: AxisPlace, axis: IAxisModelUnion) {
      self.axes.set(place, axis)
    },
    removeAxis(place: AxisPlace) {
      self.axes.delete(place)
    },
    setAttributeID(role: GraphAttrRole, dataSetID: string, id: string) {
      const newDataSet = getDataSetFromId(self, dataSetID)
      if (newDataSet && !isTileLinkedToDataSet(self, newDataSet)) {
        linkTileToDataSet(self, newDataSet)
        self.config.clearAttributes()
        self.config.setDataset(newDataSet, getTileCaseMetadata(self))
      }
      if (role === 'yPlus') {
        self.config.addYAttribute({attributeID: id})
      } else {
        self.config.setAttribute(role, {attributeID: id})
      }
      self.updateAdornments(true)
    },
    setPlotType(type: PlotType) {
      self.plotType = type
    },
    setGraphProperties(props: GraphProperties) {
      (Object.keys(props.axes) as AxisPlace[]).forEach(aKey => {
        this.setAxis(aKey, props.axes[aKey])
      })
      self.plotType = props.plotType
    },
    setPointColor(color: string, plotIndex = 0) {
      self._pointColors[plotIndex] = color
    },
    setPointStrokeColor(color: string) {
      self._pointStrokeColor = color
    },
    setPointStrokeSameAsFill(isTheSame: boolean) {
      self.pointStrokeSameAsFill = isTheSame
    },
    setPlotBackgroundColor(color: string) {
      self.plotBackgroundColor = color
    },
    setPointSizeMultiplier(multiplier: number) {
      self.pointSizeMultiplier = multiplier
    },
    setIsTransparent(transparent: boolean) {
      self.isTransparent = transparent
    },
    setShowParentToggles(show: boolean) {
      self.showParentToggles = show
    },
    setShowMeasuresForSelection(show: boolean) {
      self.showMeasuresForSelection = show
    },
    showAdornment(adornment: IAdornmentModel, type: string) {
      const adornmentExists = self.adornments.find(a => a.type === type)
      if (adornmentExists) {
        adornmentExists.setVisibility(true)
      } else {
        self.adornments.push(adornment)
      }
    },
    hideAdornment(type: string) {
      const adornment = self.adornments.find(a => a.type === type)
      adornment?.setVisibility(false)
    }
  }))
export interface IGraphModel extends Instance<typeof GraphModel> {}
export interface IGraphModelSnapshot extends SnapshotIn<typeof GraphModel> {}

export function createGraphModel(snap?: IGraphModelSnapshot) {
  return GraphModel.create({
    axes: {
      bottom: EmptyAxisModel.create({place: "bottom"}),
      left: EmptyAxisModel.create({place: "left"})
    },
    ...snap
  })
}

export interface SetAttributeIDAction extends ISerializedActionCall {
  name: "setAttributeID"
  args: [GraphAttrRole, string, string]
}

export function isSetAttributeIDAction(action: ISerializedActionCall): action is SetAttributeIDAction {
  return action.name === "setAttributeID"
}

export interface SetGraphVisualPropsAction extends ISerializedActionCall {
  name: "setGraphVisualProps"
  args: [string | number | boolean]
}

export function isGraphVisualPropsAction(action: ISerializedActionCall): action is SetGraphVisualPropsAction {
  return ['setPointColor', 'setPointStrokeColor', 'setPointStrokeSameAsFill', 'setPlotBackgroundColor',
    'setPointSizeMultiplier', 'setIsTransparent'].includes(action.name)
}

export const GraphModelContext = createContext<IGraphModel>({} as IGraphModel)

export const useGraphModelContext = () => useContext(GraphModelContext)

export function isGraphModel(model?: ITileContentModel): model is IGraphModel {
  return model?.type === kGraphTileType
}
