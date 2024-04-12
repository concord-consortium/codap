/**
 * A GraphContentModel is the top level model for the Graph component.
 * Its array of DataDisplayLayerModels has just one element, a GraphPointLayerModel.
 */
import {when} from "mobx"
import {addDisposer, IAnyStateTreeNode, Instance, SnapshotIn, types} from "mobx-state-tree"
import { format } from "d3"
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
import { attrRoleToAxisPlace, axisPlaceToAttrRole, GraphAttrRole,
         PointDisplayType } from "../../data-display/data-display-types"
import { IGetTipTextProps } from "../../data-display/data-tip-types"
import {AxisPlace, AxisPlaces, ScaleNumericBaseType} from "../../axis/axis-types"
import {kGraphTileType} from "../graph-defs"
import { CatMapType, CellType, IDomainOptions, PlotType, PlotTypes } from "../graphing-types"
import {setNiceDomain} from "../utilities/graph-utils"
import {GraphPointLayerModel, IGraphPointLayerModel, kGraphPointLayerType} from "./graph-point-layer-model"
import {IAdornmentModel, IUpdateCategoriesOptions} from "../adornments/adornment-models"
import {AxisModelUnion, EmptyAxisModel, IAxisModelUnion, isNumericAxisModel,
  NumericAxisModel} from "../../axis/models/axis-model"
import {AdornmentsStore} from "../adornments/adornments-store"
import {getPlottedValueFormulaAdapter} from "../../../models/formula/plotted-value-formula-adapter"
import {getPlottedFunctionFormulaAdapter} from "../../../models/formula/plotted-function-formula-adapter"
import { ICase } from "../../../models/data/data-set-types"
import { t } from "../../../utilities/translation/translate"
import { CaseData } from "../../data-display/d3-types"

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
    pointsFusedIntoBars: types.optional(types.boolean, false),
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
        clampPosMinAtZero: self.pointDisplayType === "bars" || self.pointsFusedIntoBars
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
    },
    fusedCasesTipText(caseID: string, legendAttrID?: string) {
      const dataConfig = self.dataConfiguration
      const dataset = dataConfig.dataset
      const float = format('.1~f')
      const primaryRole = dataConfig?.primaryRole
      const primaryAttrID = primaryRole && dataConfig?.attributeID(primaryRole)
      const topSplitAttrID = dataConfig?.attributeID("topSplit")
      const rightSplitAttrID = dataConfig?.attributeID("rightSplit")
      const casePrimaryValue = primaryAttrID && dataset?.getStrValue(caseID, primaryAttrID)
      const caseTopSplitValue = topSplitAttrID && dataset?.getStrValue(caseID, topSplitAttrID)
      const caseRightSplitValue = rightSplitAttrID && dataset?.getStrValue(caseID, rightSplitAttrID)
      const caseLegendValue = legendAttrID && dataset?.getStrValue(caseID, legendAttrID)
      const getMatchingCases = (attrID?: string, value?: string, _allCases?: ICase[]) => {
        const allCases = _allCases ?? dataset?.cases
        const matchingCases = attrID && value
          ? allCases?.filter(aCase => dataset?.getStrValue(aCase.__id__, attrID) === value) ?? []
          : []
        return matchingCases as ICase[]
      }

      // for each existing attribute, get the cases that have the same value as the current case
      const primaryMatches = getMatchingCases(primaryAttrID, casePrimaryValue)
      const topSplitMatches = getMatchingCases(topSplitAttrID, caseTopSplitValue)
      const rightSplitMatches = getMatchingCases(rightSplitAttrID, caseRightSplitValue)
      const bothSplitMatches = topSplitMatches.filter(aCase => rightSplitMatches.includes(aCase))
      const legendMatches = getMatchingCases(legendAttrID, caseLegendValue, primaryMatches)
      const cellKey: Record<string, string> = {
        ...(casePrimaryValue && {[primaryAttrID]: casePrimaryValue}),
        ...(caseTopSplitValue && {[topSplitAttrID]: caseTopSplitValue}),
        ...(caseRightSplitValue && {[rightSplitAttrID]: caseRightSplitValue})
      }
      const casesInSubPlot = dataConfig?.subPlotCases(cellKey).length
      const totalCases = [
        legendMatches.length,
        bothSplitMatches.length,
        topSplitMatches.length,
        rightSplitMatches.length,
        dataset?.cases.length ?? 0
      ].find(length => length > 0) ?? 0
      const caseCategoryString = caseLegendValue !== ""
        ? casePrimaryValue
        : ""
      const caseLegendCategoryString = caseLegendValue !== ""
        ? caseLegendValue
        : casePrimaryValue
      const firstCount = legendAttrID ? totalCases : casesInSubPlot
      const secondCount = legendAttrID ? casesInSubPlot : totalCases
      const percent = float(100 * firstCount / secondCount)
      // <n> of <m> <category> (<p>%) are <legend category>
      const attrArray = [
        firstCount, secondCount, caseCategoryString, percent, caseLegendCategoryString
      ]
      return t("DG.BarChartModel.cellTipPlural", {vars: attrArray})
    }
  }))
  .views(self => ({
    cellParams(primaryCellWidth: number, primaryHeight: number) {
      const pointDiameter = 2 * self.getPointRadius()
      const catMap: CatMapType = {}
      const dataConfig = self.dataConfiguration
      const primaryAttrRole = dataConfig.primaryRole
      const secondaryAttrRole = dataConfig.secondaryRole
      const extraPrimaryAttrRole = primaryAttrRole === 'x' ? 'topSplit' : 'rightSplit'
      const extraSecondaryAttrRole = primaryAttrRole === 'x' ? 'rightSplit' : 'topSplit'
      const primCatsArray: string[] = (primaryAttrRole)
        ? Array.from(dataConfig.categoryArrayForAttrRole(primaryAttrRole)) : []
      const secCatsArray: string[] = (secondaryAttrRole)
        ? Array.from(dataConfig.categoryArrayForAttrRole(secondaryAttrRole)) : []
      const extraPrimCatsArray: string[] = (extraPrimaryAttrRole)
        ? Array.from(dataConfig.categoryArrayForAttrRole(extraPrimaryAttrRole)) : []
      const extraSecCatsArray: string[] = (extraSecondaryAttrRole)
        ? Array.from(dataConfig.categoryArrayForAttrRole(extraSecondaryAttrRole)) : []

      primCatsArray.forEach((primCat, i) => {
        if (!catMap[primCat]) {
          catMap[primCat] = {}
        }
        secCatsArray.forEach((secCat, j) => {
          if (!catMap[primCat][secCat]) {
            catMap[primCat][secCat] = {}
          }
          extraPrimCatsArray.forEach((exPrimeCat, k) => {
            if (!catMap[primCat][secCat][exPrimeCat]) {
              catMap[primCat][secCat][exPrimeCat] = {}
            }
            extraSecCatsArray.forEach((exSecCat, l) => {
              if (!catMap[primCat][secCat][exPrimeCat][exSecCat]) {
                catMap[primCat][secCat][exPrimeCat][exSecCat] =
                  {cell: {p: i, s: j, ep: k, es: l}, numSoFar: 0}
              }
            })
          })
        })
      })

      const secondaryGap = self.pointsFusedIntoBars ? 0 : 5
      const maxInCell = dataConfig.maxOverAllCells(extraPrimaryAttrRole, extraSecondaryAttrRole) ?? 0
      const allowedPointsPerColumn = Math.max(1, Math.floor((primaryHeight - secondaryGap) / pointDiameter))
      const primaryGap = self.pointsFusedIntoBars ? 0 : 18
      const allowedPointsPerRow = Math.max(1, Math.floor((primaryCellWidth - primaryGap) / pointDiameter))
      const numPointsInRow = self.pointsFusedIntoBars
        ? 1
        : Math.max(1, Math.min(allowedPointsPerRow, Math.ceil(maxInCell / allowedPointsPerColumn)))
      const actualPointsPerColumn = self.pointsFusedIntoBars
        ? Math.ceil(maxInCell)
        : Math.ceil(maxInCell / numPointsInRow)
      const overlap =
        -Math.max(0, ((actualPointsPerColumn + 1) * pointDiameter - primaryHeight) / actualPointsPerColumn)
      
      return { catMap, numPointsInRow, overlap }
    }
  }))
  .views(self => ({
    mapOfIndicesByCase(catMap: CatMapType, numPointsInRow: number) {
      const dataConfig = self.dataConfiguration
      const dataset = dataConfig.dataset
      const indices: Record<string, {
        cell: CellType,
        row: number, column: number
      }> = {}
      const primaryAttrRole = dataConfig.primaryRole
      const primaryAttrID = primaryAttrRole ? dataConfig.attributeID(primaryAttrRole) : ''
      const secondaryAttrID = dataConfig.secondaryRole ? dataConfig.attributeID(dataConfig.secondaryRole) : ''
      const extraPrimaryAttrRole: keyof typeof attrRoleToAxisPlace = primaryAttrRole === 'x' ? 'topSplit' : 'rightSplit'
      const extraSecondaryAttrRole: keyof typeof attrRoleToAxisPlace = primaryAttrRole === 'x'
        ? 'rightSplit' : 'topSplit'
      const extraSecondaryAttrID = dataConfig?.attributeID(extraSecondaryAttrRole) ?? ''
      const extraPrimaryAttrID = dataConfig.attributeID(extraPrimaryAttrRole)

      primaryAttrID && (dataConfig.caseDataArray || []).forEach((aCaseData: CaseData) => {
        const anID = aCaseData.caseID,
          hCat = dataset?.getStrValue(anID, primaryAttrID),
          vCat = secondaryAttrID ? dataset?.getStrValue(anID, secondaryAttrID) : '__main__',
          extraHCat = extraPrimaryAttrID ? dataset?.getStrValue(anID, extraPrimaryAttrID) : '__main__',
          extraVCat = extraSecondaryAttrID ? dataset?.getStrValue(anID, extraSecondaryAttrID) : '__main__'
        if (hCat && vCat && extraHCat && extraVCat &&
          catMap[hCat]?.[vCat]?.[extraHCat]?.[extraVCat]) {
          const mapEntry = catMap[hCat][vCat][extraHCat][extraVCat]
          const numInCell = mapEntry.numSoFar++
          const row = self.pointsFusedIntoBars
                        ? Math.floor(numInCell)
                        : Math.floor(numInCell / numPointsInRow)
          const column = self.pointsFusedIntoBars ? 0 : numInCell % numPointsInRow
          indices[anID] = {cell: mapEntry.cell, row, column}
        }
      })
      return indices
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
  .actions(self => ({
    setBarCountAxis() {
      const { maxOverAllCells, primaryRole, secondaryRole } = self.dataConfiguration
      const secondaryPlace = secondaryRole === "y" ? "left" : "bottom"
      const extraPrimAttrRole = primaryRole === "x" ? "topSplit" : "rightSplit"
      const extraSecAttrRole = primaryRole === "x" ? "rightSplit" : "topSplit"
      const maxCellCaseCount = maxOverAllCells(extraPrimAttrRole, extraSecAttrRole)
      const countAxis = NumericAxisModel.create({
        scale: "linear",
        place: secondaryPlace,
        min: 0,
        max: maxCellCaseCount,
        lockZero: true
      })
      setNiceDomain([0, maxCellCaseCount], countAxis, {clampPosMinAtZero: true})
      self.setAxis(secondaryPlace, countAxis)
    },
    unsetBarCountAxis() {
      const { secondaryRole } = self.dataConfiguration
      const secondaryPlace = secondaryRole === "y" ? "left" : "bottom"
      if (isNumericAxisModel(self.getAxis(secondaryPlace))) {
        self.setAxis(secondaryPlace, EmptyAxisModel.create({ place: secondaryPlace }))
      }
    }
  }))
  .actions(self => ({
    setPointsFusedIntoBars(fuseIntoBars: boolean) {
      if (fuseIntoBars !== self.pointsFusedIntoBars) {
        if (fuseIntoBars) {
          self.setPointConfig("bars")
          self.setBarCountAxis()
        } else {
          self.setPointConfig("points")
          self.unsetBarCountAxis()
        }
        self.pointsFusedIntoBars = fuseIntoBars
      }
    },
  }))
  .views(self => ({
    get noPossibleRescales() {
      return self.plotType !== 'casePlot' &&
        !AxisPlaces.find((axisPlace: AxisPlace) => {
          return isNumericAxisModel(self.getAxis(axisPlace))
        })
    },
    getTipText(props: IGetTipTextProps) {
      const { attributeIDs, caseID, dataset, legendAttrID } = props
      if (self.pointsFusedIntoBars) {
        return self.fusedCasesTipText(caseID, legendAttrID)
      } else {
        return self.caseTipText(attributeIDs, caseID, dataset)
      }
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
