/**
 * A GraphContentModel is the top level model for the Graph component.
 * Its array of DataDisplayLayerModels has just one element, a GraphPointLayerModel.
 */
import {reaction} from "mobx"
import {addDisposer, IAnyStateTreeNode, Instance, ISerializedActionCall, SnapshotIn, types} from "mobx-state-tree"
import {applyUndoableAction} from "../../../models/history/apply-undoable-action"
import {ISharedModel} from "../../../models/shared/shared-model"
import {SharedModelChangeType} from "../../../models/shared/shared-model-manager"
import {ISharedDataSet, isSharedDataSet, kSharedDataSetType, SharedDataSet}
  from "../../../models/shared/shared-data-set"
import {typedId} from "../../../utilities/js-utils"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import {IDataSet} from "../../../models/data/data-set"
import {getDataSetFromId, getSharedCaseMetadataFromDataset, getTileCaseMetadata, getTileDataSet, linkTileToDataSet}
  from "../../../models/shared/shared-data-utils"
import {computePointRadius} from "../../data-display/data-display-utils"
import {defaultBackgroundColor} from "../../../utilities/color-utils"
import {IGraphDataConfigurationModel} from "./graph-data-configuration-model"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {GraphPlace} from "../../axis-graph-shared"
import {axisPlaceToAttrRole, GraphAttrRole} from "../../data-display/data-display-types"
import {AxisPlace, AxisPlaces, ScaleNumericBaseType} from "../../axis/axis-types"
import {kGraphTileType} from "../graph-defs"
import {PlotType, PlotTypes, PointDisplayTypes} from "../graphing-types"
import {setNiceDomain} from "../utilities/graph-utils"
import {GraphPointLayerModel, IGraphPointLayerModel, kGraphPointLayerType} from "./graph-point-layer-model"
import {IAdornmentModel, IUpdateCategoriesOptions} from "../adornments/adornment-models"
import {AxisModelUnion, EmptyAxisModel, IAxisModelUnion, isNumericAxisModel} from "../../axis/models/axis-model"
import {AdornmentsStore} from "../adornments/adornments-store"
import {getPlottedValueFormulaAdapter} from "../../../models/formula/plotted-value-formula-adapter"
import { getPlottedFunctionFormulaAdapter } from "../../../models/formula/plotted-function-formula-adapter"
import { mstAutorun } from "../../../utilities/mst-autorun"

const getFormulaAdapters = (node?: IAnyStateTreeNode) => [
  getPlottedValueFormulaAdapter(node),
  getPlottedFunctionFormulaAdapter(node)
]

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
    pointDisplayType: types.optional(types.enumeration([...PointDisplayTypes]), "points"),
    // TODO: should the default plot be something like "nullPlot" (which doesn't exist yet)?
    plotType: types.optional(types.enumeration([...PlotTypes]), "casePlot"),
    plotBackgroundColor: defaultBackgroundColor,
    isTransparent: false,
    plotBackgroundImageID: "",
    // Plots can have a background whose properties are described by this property.
    plotBackgroundLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
    // numberToggleModel: types.optional(types.union(NumberToggleModel, null))
    showParentToggles: false,
    showMeasuresForSelection: false
  })
  .volatile(() => ({
    changeCount: 0, // used to notify observers when something has changed that may require a re-computation/redraw
    prevDataSetId: ""
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
      return this.graphPointLayerModel.dataConfiguration as IGraphDataConfigurationModel
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
    },
    placeCanAcceptAttributeIDDrop(place: GraphPlace,
                             dataset: IDataSet | undefined,
                             attributeID: string | undefined): boolean {
      return self.dataConfiguration.placeCanAcceptAttributeIDDrop(place, dataset, attributeID)
    }
  }))
  .views(self => ({
    getUpdateCategoriesOptions(
      resetPoints = false, xScale?: ScaleNumericBaseType, yScale?: ScaleNumericBaseType
    ): IUpdateCategoriesOptions {
      return {
        dataConfig: self.dataConfiguration,
        interceptLocked: self.adornmentsStore.interceptLocked,
        resetPoints,
        xAxis: self.getAxis("bottom"),
        yAxis: self.getAxis("left"),
        xScale,
        yScale
      }
    }
  }))
  .actions(self => ({
    afterCreate() {
      self.layers.push(GraphPointLayerModel.create({type: kGraphPointLayerType}))
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

          return {sharedModelManager, sharedDataSets, formulaAdapters: getFormulaAdapters(self)}
        },
        // reaction/effect
        ({sharedModelManager, sharedDataSets, formulaAdapters}) => {
          if (!sharedModelManager?.isReady) {
            // We aren't added to a document yet, so we can't do anything yet
            return
          }

          const tileDataSet = getTileDataSet(self)
          if (self.dataset || self.metadata) {
            self.dataConfiguration.setDataset(self.dataset, self.metadata)
          } else if (!tileDataSet && sharedDataSets.length === 1) {
            linkTileToDataSet(self, sharedDataSets[0].dataSet)
          }

          formulaAdapters.forEach(adapter => {
            adapter?.addGraphContentModel(self as IGraphContentModel)
          })
        },
        {name: "sharedModelSetup", fireImmediately: true}))
      // update adornments when case data changes
      addDisposer(self, mstAutorun(function updateAdornments() {
        self.dataConfiguration.casesChangeCount // eslint-disable-line no-unused-expressions
        const updateCategoriesOptions = self.getUpdateCategoriesOptions()
        self.adornmentsStore.updateAdornments(updateCategoriesOptions)
      }, { name: "GraphContentModel.afterAttachToDocument.updateAdornments" }, self.dataConfiguration))
    },
    beforeDestroy() {
      getFormulaAdapters(self).forEach(adapter => {
        adapter?.removeGraphContentModel(self.id)
      })
    }
  }))
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel: ISharedModel | undefined, type: SharedModelChangeType) {
      if (type === "link") {
        self.dataConfiguration.setDataset(self.dataset, self.metadata)
      } else if (type === "unlink" && isSharedDataSet(sharedModel)) {
        self.dataConfiguration.setDataset(undefined, undefined)
      }
    }
  }))
  .views(self => ({
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      return computePointRadius(self.dataConfiguration.caseDataArray.length,
        self.pointDescription.pointSizeMultiplier, use)
    },
  }))
  .actions(self => ({
    incrementChangeCount() {
      ++self.changeCount
    },
    rescale() {
      if (self.plotType === 'casePlot') {
        this.incrementChangeCount()
      } else {
        const {dataConfiguration} = self
        AxisPlaces.forEach((axisPlace: AxisPlace) => {
          const axis = self.getAxis(axisPlace),
            role = axisPlaceToAttrRole[axisPlace]
          if (isNumericAxisModel(axis)) {
            const numericValues = dataConfiguration.numericValuesForAttrRole(role)
            setNiceDomain(numericValues, axis)
          }
        })
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
      if (newDataSet && newDataSet !== self.dataConfiguration.dataset) {
        // update shared model manager
        linkTileToDataSet(self, newDataSet)
        // update data configuration
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
    setPointConfig(configType: string) {
      self.pointDisplayType = configType
    },
    setPlotBackgroundColor(color: string) {
      self.plotBackgroundColor = color
    },
    setIsTransparent(transparent: boolean) {
      self.isTransparent = transparent
    },
    setShowParentToggles(show: boolean) {
      self.showParentToggles = show
    },
    setShowMeasuresForSelection(show: boolean) {
      self.showMeasuresForSelection = show
    }
  }))
  .views(self => ({
    get noPossibleRescales() {
      return self.plotType !== 'casePlot' &&
        !AxisPlaces.find((axisPlace: AxisPlace) => {
          return isNumericAxisModel(self.getAxis(axisPlace))
        }) }
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
