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
import {IGraphDataConfigurationModel} from "./graph-data-configuration-model"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {GraphPlace} from "../../axis-graph-shared"
import {axisPlaceToAttrRole, GraphAttrRole, PointDisplayType} from "../../data-display/data-display-types"
import {AxisPlace, AxisPlaces, ScaleNumericBaseType} from "../../axis/axis-types"
import {kGraphTileType} from "../graph-defs"
import {IDomainOptions, PlotType, PlotTypes} from "../graphing-types"
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
    _binAlignment: types.maybe(types.number),
    _binWidth: types.maybe(types.number),
    // TODO: should the default plot be something like "nullPlot" (which doesn't exist yet)?
    plotType: types.optional(types.enumeration([...PlotTypes]), "casePlot"),
    plotBackgroundImage: types.maybe(types.string),
    plotBackgroundImageLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
    // Plots can have a background whose properties are described by this property.
    plotBackgroundLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
    // numberToggleModel: types.optional(types.union(NumberToggleModel, null))
    showParentToggles: false,
    showMeasuresForSelection: false
  })
  .volatile(() => ({
    changeCount: 0, // used to notify observers when something has changed that may require a re-computation/redraw
    dragBinIndex: -1,
    dynamicBinAlignment: undefined as number | undefined,
    dynamicBinWidth: undefined as number | undefined,
    prevDataSetId: ""
  }))
  .actions(self => ({
    addLayer(aLayer: IGraphPointLayerModel) {
      self.layers.push(aLayer)
    },
    setDragBinIndex(index: number) {
      self.dragBinIndex = index
    }
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
    get datasetsArray(): IDataSet[] {
      return !this.dataset ? [] : [this.dataset]
    },
    get metadata() {
      return getTileCaseMetadata(self)
    },
    get adornments(): IAdornmentModel[] {
      return self.adornmentsStore.adornments
    },
    get binAlignment() {
      return self.dynamicBinAlignment ?? self._binAlignment
    },
    get binWidth() {
      return self.dynamicBinWidth ?? self._binWidth
    },
    get isBinBoundaryDragging() {
      return self.dragBinIndex >= 0
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
    get axisDomainOptions(): IDomainOptions {
      return {
        // When displaying bars, the domain should start at 0 unless there are negative values.
        clampPosMinAtZero: self.pointDisplayType === "bars"
      }
    },
    binWidthFromData(minValue: number, maxValue: number): number {
      if (minValue === Infinity || maxValue === -Infinity) return 1
      const kDefaultNumberOfBins = 4

      const binRange = maxValue !== minValue
        ? (maxValue - minValue) / kDefaultNumberOfBins
        : 1 / kDefaultNumberOfBins
      // Convert to a logarithmic scale (base 10)
      const logRange = Math.log(binRange) / Math.LN10
      const significantDigit = Math.pow(10.0, Math.floor(logRange))
      // Determine the scale factor based on the significant digit
      const scaleFactor = Math.pow(10.0, logRange - Math.floor(logRange))
      const adjustedScaleFactor = scaleFactor < 2 ? 1 : scaleFactor < 5 ? 2 : 5
      return Math.max(significantDigit * adjustedScaleFactor, Number.MIN_VALUE)
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
    },
    binDetails(options?: { initialize?: boolean }) {
      const { initialize = false } = options ?? {}
      const { caseDataArray, dataset, primaryAttributeID } = self.dataConfiguration
      const minValue = caseDataArray.reduce((min, aCaseData) => {
        return Math.min(min, dataset?.getNumeric(aCaseData.caseID, primaryAttributeID) ?? min)
      }, Infinity)
      const maxValue = caseDataArray.reduce((max, aCaseData) => {
        return Math.max(max, dataset?.getNumeric(aCaseData.caseID, primaryAttributeID) ?? max)
      }, -Infinity)

      if (minValue === Infinity || maxValue === -Infinity) {
        return { binAlignment: 0, binWidth: 1, minBinEdge: 0, maxBinEdge: 0, minValue: 0, maxValue: 0,
                 totalNumberOfBins: 0 }
      }

      const binWidth = initialize || !self.binWidth
                         ? self.binWidthFromData(minValue, maxValue)
                         : self.binWidth
      const binAlignment = initialize || !self.binAlignment
                             ? Math.floor(minValue / binWidth) * binWidth
                             : self.binAlignment
      const minBinEdge = binAlignment - Math.ceil((binAlignment - minValue) / binWidth) * binWidth
      // Calculate the total number of bins needed to cover the range from the minimum data value
      // to the maximum data value, adding a small constant to ensure the max value is contained.
      const totalNumberOfBins = Math.ceil((maxValue - minBinEdge) / binWidth + 0.000001)
      const maxBinEdge = minBinEdge + (totalNumberOfBins * binWidth)
    
      return { binAlignment, binWidth, minBinEdge, maxBinEdge, minValue, maxValue, totalNumberOfBins }
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
    },
    setBinAlignment(alignment: number) {
      self._binAlignment = alignment
      self.dynamicBinAlignment = undefined
    },
    setDynamicBinAlignment(alignment: number) {
      self.dynamicBinAlignment = alignment
    },
    setBinWidth(width: number) {
      self._binWidth = width
      self.dynamicBinWidth = undefined
    },
    setDynamicBinWidth(width: number) {
      self.dynamicBinWidth = width
    }
  }))
  .views(self => ({
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      return computePointRadius(self.dataConfiguration.caseDataArray.length,
        self.pointDescription.pointSizeMultiplier, use)
    },
    nonDraggableAxisTicks(formatter: (value: number) => string): { tickValues: number[], tickLabels: string[] } {
      const tickValues: number[] = []
      const tickLabels: string[] = []
      const { binWidth, totalNumberOfBins, minBinEdge } = self.binDetails()

      let currentStart = minBinEdge
      let binCount = 0

      while (binCount < totalNumberOfBins) {
        const formattedCurrentStart = formatter
          ? formatter(currentStart)
          : currentStart
        const formattedCurrentEnd = formatter
          ? formatter(currentStart + binWidth)
          : currentStart + binWidth
        tickValues.push(currentStart + (binWidth / 2))
        tickLabels.push(`[${formattedCurrentStart}, ${formattedCurrentEnd})`)
        currentStart += binWidth
        binCount++
      }
      return { tickValues, tickLabels }
    },
    resetBinSettings() {
      const { binAlignment, binWidth } = self.binDetails({ initialize: true })
      self.setBinAlignment(binAlignment)
      self.setBinWidth(binWidth)
    },
    endBinBoundaryDrag(binAlignment: number, binWidth: number) {
      self.setDragBinIndex(-1)
      self.setBinAlignment(binAlignment)
      self.setBinWidth(binWidth)
    }
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
            setNiceDomain(numericValues, axis, self.axisDomainOptions)
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
      self.dataConfiguration.primaryAttributeID && self.resetBinSettings()
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
      if (configType === "bins") {
        const { binWidth, binAlignment } = self.binDetails({ initialize: true })
        self.setBinWidth(binWidth)
        self.setBinAlignment(binAlignment)
      }
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
