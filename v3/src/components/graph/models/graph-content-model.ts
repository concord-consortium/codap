/**
 * A GraphContentModel is the top level model for the Graph component.
 * Its array of DataDisplayLayerModels has just one element, a GraphPointLayerModel.
 */
import {when} from "mobx"
import {addDisposer, IAnyStateTreeNode, Instance, SnapshotIn, types} from "mobx-state-tree"
import {mstAutorun} from "../../../utilities/mst-autorun"
import {applyUndoableAction} from "../../../models/history/apply-undoable-action"
import {ISharedModel} from "../../../models/shared/shared-model"
import {SharedModelChangeType} from "../../../models/shared/shared-model-manager"
import {typedId} from "../../../utilities/js-utils"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import {IDataSet} from "../../../models/data/data-set"
import {
  getDataSetFromId, getSharedCaseMetadataFromDataset, getTileCaseMetadata, getTileDataSet
} from "../../../models/shared/shared-data-utils"
import {computePointRadius} from "../../data-display/data-display-utils"
import {defaultBackgroundColor} from "../../../utilities/color-utils"
import {IGraphDataConfigurationModel} from "./graph-data-configuration-model"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {GraphPlace} from "../../axis-graph-shared"
import {axisPlaceToAttrRole, GraphAttrRole, PointDisplayType,
        PointDisplayTypes} from "../../data-display/data-display-types"
import {AxisPlace, AxisPlaces, ScaleNumericBaseType} from "../../axis/axis-types"
import {kGraphTileType} from "../graph-defs"
import {PlotType, PlotTypes} from "../graphing-types"
import {setNiceDomain} from "../utilities/graph-utils"
import {GraphPointLayerModel, IGraphPointLayerModel, kGraphPointLayerType} from "./graph-point-layer-model"
import {IAdornmentModel, IUpdateCategoriesOptions} from "../adornments/adornment-models"
import {AxisModelUnion, EmptyAxisModel, IAxisModelUnion, isNumericAxisModel} from "../../axis/models/axis-model"
import {AdornmentsStore} from "../adornments/adornments-store"
import {getPlottedValueFormulaAdapter} from "../../../models/formula/plotted-value-formula-adapter"
import {getPlottedFunctionFormulaAdapter} from "../../../models/formula/plotted-function-formula-adapter"

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
    },
    nonDraggableAxisTicks(): { tickValues: number[], tickLabels: string[] } {
      const tickValues: number[] = []
      const tickLabels: string[] = []
      const { binWidth, totalNumberOfBins  } = self.dataConfiguration.binDetails()
      for (let i = 0; i < totalNumberOfBins; i++) {
        tickValues.push(((i + 0.5) * binWidth))
        tickLabels.push(`[${i * binWidth}, ${(i + 1) * binWidth})`)
      }
      return { tickValues, tickLabels }
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
      // add default layer if it's not already present
      if (self.layers.length === 0) {
        self.layers.push(GraphPointLayerModel.create({type: kGraphPointLayerType}))
      }
      // add default axes if they're not already present
      if (!self.axes.get("bottom")) {
        self.axes.set("bottom", EmptyAxisModel.create({place: "bottom"}))
      }
      if (!self.axes.get("left")) {
        self.axes.set("left", EmptyAxisModel.create({place: "left"}))
      }
    }
  }))
  .actions(self => ({
    async afterAttachToDocument() {
      if (!self.tileEnv?.sharedModelManager?.isReady) {
        await when(() => !!self.tileEnv?.sharedModelManager?.isReady)
      }

      getFormulaAdapters(self).forEach(adapter => {
        adapter?.addGraphContentModel(self as IGraphContentModel)
      })

      self.installSharedModelManagerSync()

      // update adornments when case data changes
      addDisposer(self, mstAutorun(function updateAdornments() {
        self.dataConfiguration.casesChangeCount // eslint-disable-line no-unused-expressions
        const updateCategoriesOptions = self.getUpdateCategoriesOptions()
        self.adornmentsStore.updateAdornments(updateCategoriesOptions)
      }, {name: "GraphContentModel.afterAttachToDocument.updateAdornments"}, self.dataConfiguration))
    },
    beforeDestroy() {
      getFormulaAdapters(self).forEach(adapter => {
        adapter?.removeGraphContentModel(self.id)
      })
    }
  }))
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel: ISharedModel | undefined, type: SharedModelChangeType) {
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
    setPointConfig(configType: PointDisplayType) {
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
        })
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
