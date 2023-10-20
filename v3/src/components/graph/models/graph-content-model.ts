/**
 * A GraphContentModel is the top level model for the Graph component.
 * Its array of DataDisplayLayerModels has just one element, a GraphPointLayerModel.
 */
import {reaction} from "mobx"
import {addDisposer, Instance, ISerializedActionCall, SnapshotIn, types} from "mobx-state-tree"
import {onAnyAction} from "../../../utilities/mst-utils"
import {applyUndoableAction} from "../../../models/history/apply-undoable-action"
import {ISharedModel} from "../../../models/shared/shared-model"
import {SharedModelChangeType} from "../../../models/shared/shared-model-manager"
import {ISharedDataSet, isSharedDataSet, kSharedDataSetType, SharedDataSet}
  from "../../../models/shared/shared-data-set"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import {getDataSetFromId, getSharedCaseMetadataFromDataset, getTileCaseMetadata, getTileDataSet, linkTileToDataSet}
  from "../../../models/shared/shared-data-utils"
import {defaultBackgroundColor} from "../../../utilities/color-utils"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {AxisPlace} from "../../axis/axis-types"
import {kGraphTileType} from "../graph-defs"
import {hoverRadiusFactor, pointRadiusLogBase, pointRadiusMax, pointRadiusMin, pointRadiusSelectionAddend}
  from "../../data-display/data-display-types"
import {GraphAttrRole, PlotType, PlotTypes} from "../graphing-types"
import {GraphPointLayerModel, IGraphPointLayerModel} from "./graph-point-layer-model"
import {IAdornmentModel, IUpdateCategoriesOptions} from "../adornments/adornment-models"
import {AxisModelUnion, EmptyAxisModel, IAxisModelUnion, isNumericAxisModel} from "../../axis/models/axis-model"
import { AdornmentsStore } from "../adornments/adornments-store"
import { typedId } from "../../../utilities/js-utils"
import { getPlottedValueFormulaAdapter } from "../../../models/data/plotted-value-formula-adapter"

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

export const GraphContentModel = DataDisplayContentModel
  .named("GraphContentModel")
  .props({
    id: types.optional(types.identifier, () => typedId("GRCM")),
    type: types.optional(types.literal(kGraphTileType), kGraphTileType),
    adornmentsStore: types.optional(AdornmentsStore, () => AdornmentsStore.create()),
    // keys are AxisPlaces
    axes: types.map(AxisModelUnion),
    // TODO: should the default plot be something like "nullPlot" (which doesn't exist yet)?
    plotType: types.optional(types.enumeration([...PlotTypes]), "casePlot"),
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
  .volatile(() => ({
    prevDataSetId: "",
    disposeDataSetListener: undefined as (() => void) | undefined
  }))
  .actions(self => ({
    addLayer(aLayer: IGraphPointLayerModel) {
      self.layers.push(aLayer)
    },
  }))
  .views(self => ({
    get graphPointLayerModel(): IGraphPointLayerModel {
      return self.layers[0] as IGraphPointLayerModel
    },
    get dataConfiguration() {
      return this.graphPointLayerModel.dataConfiguration
    },
    get dataset() {
      return getTileDataSet(self)
    },
    get metadata() {
      return getTileCaseMetadata(self)
    },
    get adornments(): IAdornmentModel[] {
      return self.adornmentsStore.adornments
    }
  }))
  .views(self => ({
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    },
    getNumericAxis(place: AxisPlace) {
      const axis = self.axes.get(place)
      return isNumericAxisModel(axis) ? axis : undefined
    },
    getAttributeID(place: GraphAttrRole) {
      return self.dataConfiguration.attributeID(place) ?? ''
    },
    axisShouldShowGridLines(place: AxisPlace) {
      return self.plotType === 'scatterPlot' && ['left', 'bottom'].includes(place)
    }
  }))
  .views(self => ({
    getUpdateCategoriesOptions(resetPoints=false): IUpdateCategoriesOptions {
      const xAttrId = self.getAttributeID("x"),
        dataConfig = self.dataConfiguration,
        xAttrType = dataConfig.attributeType("x"),
        xCats = xAttrType === "categorical"
          ? dataConfig.categoryArrayForAttrRole("x", [])
          : [""],
        yAttrId = self.getAttributeID("y"),
        yAttrType = dataConfig.attributeType("y"),
        yCats = yAttrType === "categorical"
          ? dataConfig.categoryArrayForAttrRole("y", [])
          : [""],
        topAttrId = self.getAttributeID("topSplit"),
        topCats = dataConfig.categoryArrayForAttrRole("topSplit", []) ?? [""],
        rightAttrId = self.getAttributeID("rightSplit"),
        rightCats = dataConfig.categoryArrayForAttrRole("rightSplit", []) ?? [""]
      return {
        xAxis: self.getAxis("bottom"),
        xAttrId,
        xCats,
        yAxis: self.getAxis("left"),
        yAttrId,
        yCats,
        topAttrId,
        topCats,
        rightAttrId,
        rightCats,
        resetPoints,
        dataConfig
      }
    }
  }))
  .actions(self => ({
    afterCreate() {
      self.layers.push(GraphPointLayerModel.create({type: "graphPointLayer"}))
    },
    setDataSetListener() {
      const actionsAffectingCategories = [
        "addCases", "removeAttribute", "removeCases", "setCaseValues"
      ]
      self.disposeDataSetListener?.()
      self.disposeDataSetListener = self.dataset
        ? onAnyAction(self.dataset, action => {
            // TODO: check whether categories have actually changed before updating
            if (actionsAffectingCategories.includes(action.name)) {
              const updateCategoriesOptions = self.getUpdateCategoriesOptions()
              self.adornmentsStore.updateAdornments(updateCategoriesOptions)
            }
          })
        : undefined
    },
    afterAttachToDocument() {
      // Monitor our parents and update our shared model when we have a document parent
      addDisposer(self, reaction(() => {
          const sharedModelManager = self.tileEnv?.sharedModelManager

          const sharedDataSets: ISharedDataSet[] = sharedModelManager?.isReady
            ? sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
            : []

          const plottedValueFormulaAdapter = getPlottedValueFormulaAdapter(self)

          return {sharedModelManager, sharedDataSets, plottedValueFormulaAdapter}
        },
        // reaction/effect
        ({sharedModelManager, sharedDataSets, plottedValueFormulaAdapter}) => {
          if (!sharedModelManager?.isReady) {
            // We aren't added to a document yet, so we can't do anything yet
            return
          }

          const tileDataSet = getTileDataSet(self)
          if (self.dataset || self.metadata) {
            self.dataConfiguration.setDataset(self.dataset, self.metadata)
          }
          else if (!tileDataSet && sharedDataSets.length === 1) {
            linkTileToDataSet(self, sharedDataSets[0].dataSet)
          }

          if (plottedValueFormulaAdapter) {
            plottedValueFormulaAdapter.addGraphContentModel(self as IGraphContentModel)
          }
        },
        {name: "sharedModelSetup", fireImmediately: true}))
    },
    beforeDestroy() {
      const plottedValueFormulaAdapter = getPlottedValueFormulaAdapter(self)
      if (plottedValueFormulaAdapter) {
        plottedValueFormulaAdapter.removeGraphContentModel(self.id)
      }
      self.disposeDataSetListener?.()
    }
  }))
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel: ISharedModel | undefined, type: SharedModelChangeType) {
      if (type === "link") {
        self.dataConfiguration.setDataset(self.dataset, self.metadata)
      } else if (type === "unlink" && isSharedDataSet(sharedModel)) {
        self.dataConfiguration.setDataset(undefined, undefined)
      }
      const currDataSetId = self.dataConfiguration.dataset?.id ?? ""
      if (self.prevDataSetId !== currDataSetId) {
        self.setDataSetListener()
        self.prevDataSetId = currDataSetId
      }
    }
  }))
  .views(self => ({
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      let r = pointRadiusMax
      const numPoints = self.dataConfiguration.caseDataArray.length
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
  }))
  .actions(self => ({
    setAxis(place: AxisPlace, axis: IAxisModelUnion) {
      self.axes.set(place, axis)
    },
    removeAxis(place: AxisPlace) {
      self.axes.delete(place)
    },
    setAttributeID(role: GraphAttrRole, dataSetID: string, id: string) {
      const newDataSet = getDataSetFromId(self, dataSetID)
      if (newDataSet && newDataSet !== self.dataConfiguration.dataset) {
        self.dataConfiguration.clearAttributes()
        self.dataConfiguration.setDataset(newDataSet, getSharedCaseMetadataFromDataset(newDataSet))
      }
      if (role === 'yPlus') {
        self.dataConfiguration.addYAttribute({attributeID: id})
      } else {
        self.dataConfiguration.setAttribute(role, {attributeID: id})
      }
      const updateCategoriesOptions = self.getUpdateCategoriesOptions(true)
      self.adornmentsStore.updateAdornments(updateCategoriesOptions)
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
    setPlotBackgroundColor(color: string) {
      self.plotBackgroundColor = color
    },
    setIsTransparent(transparent: boolean) {
      self.isTransparent = transparent
    },
    setPointSizeMultiplier(multiplier: number) {
      self.pointSizeMultiplier = multiplier
    },
    setShowParentToggles(show: boolean) {
      self.showParentToggles = show
    },
    setShowMeasuresForSelection(show: boolean) {
      self.showMeasuresForSelection = show
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyUndoableAction)

export interface IGraphContentModel extends Instance<typeof GraphContentModel> {
}

export interface IGraphContentModelSnapshot extends SnapshotIn<typeof GraphContentModel> {
}

export function isGraphContentModel(model?: ITileContentModel): model is IGraphContentModel {
  return model?.type === kGraphTileType
}

export function createGraphContentModel(snap?: IGraphContentModelSnapshot) {
  return GraphContentModel.create({
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
