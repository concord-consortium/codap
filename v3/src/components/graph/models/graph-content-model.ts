/**
 * A GraphContentModel is the top level model for the Graph component.
 * Its array of DataDisplayLayerModels has just one element, a GraphPointLayerModel.
 */
import {cloneDeep} from "lodash"
import { comparer, when } from "mobx"
import { format } from "d3"
import {addDisposer, Instance, SnapshotIn, types} from "mobx-state-tree"
import { t } from "../../../utilities/translation/translate"
import { mstReaction } from "../../../utilities/mst-reaction"
import {IDataSet} from "../../../models/data/data-set"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {
  getDataSetFromId, getSharedCaseMetadataFromDataset, getTileCaseMetadata, getTileDataSet
} from "../../../models/shared/shared-data-utils"
import {ISharedModel, SharedModelChangeType} from "../../../models/shared/shared-model"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import { getFormulaManager } from "../../../models/tiles/tile-environment"
import {typedId} from "../../../utilities/js-utils"
import {mstAutorun} from "../../../utilities/mst-autorun"
import { ICase } from "../../../models/data/data-set-types"
import { isFiniteNumber } from "../../../utilities/math-utils"
import { CaseData } from "../../data-display/d3-types"
import { computePointRadius } from "../../data-display/data-display-utils"
import { dataDisplayGetNumericValue } from "../../data-display/data-display-value-utils"
import {IGraphDataConfigurationModel} from "./graph-data-configuration-model"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {
  AxisModelUnion, EmptyAxisModel, IAxisModelUnion, isBaseNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import {GraphPlace} from "../../axis-graph-shared"
import { attrRoleToAxisPlace, axisPlaceToAttrRole, GraphAttrRole, kMain, kOther, PointDisplayType }
  from "../../data-display/data-display-types"
import { IGetTipTextProps } from "../../data-display/data-tip-types"
import {AxisPlace, AxisPlaces, ScaleNumericBaseType} from "../../axis/axis-types"
import {kGraphTileType} from "../graph-defs"
import { CatMapType, CellType, IDomainOptions, PlotType, PlotTypes } from "../graphing-types"
import {setNiceDomain} from "../utilities/graph-utils"
import {GraphPointLayerModel, IGraphPointLayerModel, kGraphPointLayerType} from "./graph-point-layer-model"
import {IAdornmentModel, IUpdateCategoriesOptions} from "../adornments/adornment-models"
import {AdornmentsStore} from "../adornments/store/adornments-store"

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
    id: types.optional(types.string, () => typedId("GRCM")),
    type: types.optional(types.literal(kGraphTileType), kGraphTileType),
    adornmentsStore: types.optional(AdornmentsStore, () => AdornmentsStore.create()),
    // keys are AxisPlaces
    axes: types.map(AxisModelUnion),
    _binAlignment: types.maybe(types.number),
    _binWidth: types.maybe(types.number),
    pointsAreBinned: types.optional(types.boolean, false),
    pointsFusedIntoBars: types.optional(types.boolean, false),
    // TODO: should the default plot be something like "nullPlot" (which doesn't exist yet)?
    plotType: types.optional(types.enumeration([...PlotTypes]), "casePlot"),
    plotBackgroundImage: types.maybe(types.string),
    plotBackgroundImageLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
    // Plots can have a background whose properties are described by this property.
    plotBackgroundLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
    // numberToggleModel: types.optional(types.union(NumberToggleModel, null))
    showParentToggles: false,
    showOnlyLastCase: types.maybe(types.boolean)
  })
  .volatile(() => ({
    changeCount: 0, // used to notify observers when something has changed that may require a re-computation/redraw
    dragBinIndex: -1,
    dynamicBinAlignment: undefined as number | undefined,
    dynamicBinWidth: undefined as number | undefined,
    prevDataSetId: "",
    pointOverlap: 0,  // Set by plots so that it is accessible to adornments
  }))
  .preProcessSnapshot(snap => {
    // some properties were historically written out as null because NaN => null in JSON
    const nullCheckProps: Array<keyof typeof snap> = ["_binAlignment", "_binWidth"]
    // are there any `null` properties?
    if (nullCheckProps.some(prop => snap[prop] === null)) {
      // if so, clone the snapshot
      snap = cloneDeep(snap)
      // and delete the `null` properties
      nullCheckProps.forEach(prop => (snap[prop] === null) && delete snap[prop])
    }
    return snap
  })
  .actions(self => ({
    addLayer(aLayer: IGraphPointLayerModel) {
      self.layers.push(aLayer)
    },
    setDragBinIndex(index: number) {
      self.dragBinIndex = index
    },
    setPointOverlap(overlap: number) {
      self.pointOverlap = overlap
    },
    setBinWidth(width: number | undefined) {
      self._binWidth = isFiniteNumber(width) ? width : undefined
      self.dynamicBinWidth = undefined
    },
    setDynamicBinWidth(width: number) {
      self.dynamicBinWidth = width
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
      // Include DataAxisModels
      return isBaseNumericAxisModel(axis) ? axis : undefined
    },
    getAttributeID(place: GraphAttrRole) {
      return self.dataConfiguration.attributeID(place) ?? ''
    },
    axisShouldShowGridLines(place: AxisPlace) {
      return (self.plotType === 'scatterPlot' && ['left', 'bottom'].includes(place)) ||
             (self.pointDisplayType === "histogram")
    },
    axisShouldShowZeroLine(place: AxisPlace) {
      return (self.plotType === 'dotPlot' && ['left', 'bottom'].includes(place)) && self.pointDisplayType === "bars"
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
    binWidthFromData(minValue: number, maxValue: number) {
      if (minValue === Infinity || maxValue === -Infinity || minValue === maxValue) return undefined
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
      const { dataset, primaryAttributeID } = self.dataConfiguration
      const caseDataArray = self.dataConfiguration.getCaseDataArray(0)
      const minValue = caseDataArray.reduce((min, aCaseData) => {
        return Math.min(min, dataDisplayGetNumericValue(dataset, aCaseData.caseID, primaryAttributeID) ?? min)
      }, Infinity)
      const maxValue = caseDataArray.reduce((max, aCaseData) => {
        return Math.max(max, dataDisplayGetNumericValue(dataset, aCaseData.caseID, primaryAttributeID) ?? max)
      }, -Infinity)
      const binWidth = (initialize || !self.binWidth)
        ? self.binWidthFromData(minValue, maxValue) : self.binWidth
      if (minValue === Infinity || maxValue === -Infinity || binWidth === undefined) {
        return { binAlignment: 0, binWidth: undefined, minBinEdge: 0, maxBinEdge: 0, minValue: 0, maxValue: 0,
          totalNumberOfBins: 0 }
      }

      const binAlignment = initialize || !self.binAlignment
        ? Math.floor(minValue / binWidth) * binWidth
        : self.binAlignment
      const minBinEdge = binAlignment - Math.ceil((binAlignment - minValue) / binWidth) * binWidth
      // Calculate the total number of bins needed to cover the range from the minimum data value
      // to the maximum data value, adding a small constant to ensure the max value is contained.
      const totalNumberOfBins = Math.ceil((maxValue - minBinEdge) / binWidth + 0.000001)
      const maxBinEdge = minBinEdge + (totalNumberOfBins * binWidth)

      return { binAlignment, binWidth, minBinEdge, maxBinEdge, minValue, maxValue, totalNumberOfBins }
    },
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

      // register with the formula adapters once they've been initialized
      when(
        () => getFormulaManager(self)?.areAdaptersInitialized ?? false,
        () => {
          self.formulaAdapters.forEach(adapter => {
            adapter?.addContentModel(self)
          })
        }
      )

      self.installSharedModelManagerSync()

      // update adornments when case data changes
      addDisposer(self, mstAutorun(function updateAdornments() {
        self.dataConfiguration.casesChangeCount // eslint-disable-line @typescript-eslint/no-unused-expressions
        const updateCategoriesOptions = self.getUpdateCategoriesOptions()
        self.adornmentsStore.updateAdornments(updateCategoriesOptions)
      }, {name: "GraphContentModel.afterAttachToDocument.updateAdornments"}, self.dataConfiguration))

      // When showMeasuresForSelection is true, update adornments when selection changes
      addDisposer(self, mstReaction(() => {
        return self.dataConfiguration.selection
      },
        () => {
          if (self.dataConfiguration.showMeasuresForSelection) {
            const updateCategoriesOptions = self.getUpdateCategoriesOptions()
            self.adornmentsStore.updateAdornments(updateCategoriesOptions)
          }
      }, {name: "GraphContentModel.afterAttachToDocument.updateAdornments", equals: comparer.structural},
        self.dataConfiguration))
    },
    beforeDestroy() {
      self.formulaAdapters.forEach(adapter => {
        adapter?.removeContentModel(self.id)
      })
    }
  }))
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel: ISharedModel | undefined, type: SharedModelChangeType) {
    },
    setBinAlignment(alignment: number) {
      self._binAlignment = isFiniteNumber(alignment) ? alignment : undefined
      self.dynamicBinAlignment = undefined
    },
    setDynamicBinAlignment(alignment: number) {
      self.dynamicBinAlignment = alignment
    },
    binnedAxisTicks(formatter?: (value: number) => string): { tickValues: number[], tickLabels: string[] } {
      const tickValues: number[] = []
      const tickLabels: string[] = []
      const { binWidth, totalNumberOfBins, minBinEdge } = self.binDetails()
      if (binWidth !== undefined) {
        let currentStart = minBinEdge
        let binCount = 0

        while (binCount < totalNumberOfBins) {
          const currentEnd = currentStart + binWidth
          if (formatter) {
            const formattedCurrentStart = formatter(currentStart)
            const formattedCurrentEnd = formatter(currentEnd)
            tickValues.push(currentStart + (binWidth / 2))
            tickLabels.push(`[${formattedCurrentStart}, ${formattedCurrentEnd})`)
          } else {
            tickValues.push(currentStart + binWidth)
            tickLabels.push(`${currentEnd}`)
          }
          currentStart += binWidth
          binCount++
        }
      }
      return { tickValues, tickLabels }
    },
    setDataSet(dataSetID: string) {
      const newDataSet = getDataSetFromId(self, dataSetID)
      if (newDataSet && newDataSet !== self.dataConfiguration.dataset) {
        self.dataConfiguration.clearAttributes()
        self.dataConfiguration.setDataset(newDataSet, getSharedCaseMetadataFromDataset(newDataSet))
      }
    }
  }))
  .views(self => ({
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      return computePointRadius(self.dataConfiguration.getCaseDataArray(0).length,
        self.pointDescription.pointSizeMultiplier, use)
    },
    nonDraggableAxisTicks(formatter: (value: number) => string): { tickValues: number[], tickLabels: string[] } {
      const tickValues: number[] = []
      const tickLabels: string[] = []
      const { binWidth, totalNumberOfBins, minBinEdge } = self.binDetails()

      if (binWidth !== undefined) {
        let currentStart = minBinEdge
        let binCount = 0

        while (binCount < totalNumberOfBins) {
          const currentEnd = currentStart + binWidth
          const formattedCurrentStart = formatter(currentStart)
          const formattedCurrentEnd = formatter(currentEnd)
          tickValues.push(currentStart + (binWidth / 2))
          tickLabels.push(`[${formattedCurrentStart}, ${formattedCurrentEnd})`)
          currentStart += binWidth
          binCount++
        }
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
    matchingCasesForAttr(attrID: string, value?: string, _allCases?: ICase[]) {
      const dataset = self.dataConfiguration?.dataset
      const allCases = _allCases ?? dataset?.items
      let matchingCases: ICase[] = []

      if (self.pointDisplayType === "histogram") {
        const { binWidth, minBinEdge } = self.binDetails()
        if (binWidth !== undefined) {
          const binIndex = Math.floor((Number(value) - minBinEdge) / binWidth)
          matchingCases = allCases?.filter(aCase => {
            const caseValue = dataDisplayGetNumericValue(dataset, aCase.__id__, attrID) ?? 0
            const bin = Math.floor((caseValue - minBinEdge) / binWidth)
            return bin === binIndex
          }) as ICase[] ?? []
        }
      } else if (attrID && value) {
        matchingCases = allCases?.filter(aCase => dataset?.getStrValue(aCase.__id__, attrID) === value) as ICase[] ?? []
      }

      return matchingCases
    }
  }))
  .views(self => ({
    fusedCasesTipText(caseID: string, legendAttrID?: string) {
      const dataConfig = self.dataConfiguration
      const dataset = dataConfig.dataset
      const isHistogram = self.pointDisplayType === "histogram"
      const float = format('.1~f')
      const primaryRole = dataConfig?.primaryRole
      const primaryAttrID = primaryRole && dataConfig?.attributeID(primaryRole)
      const topSplitAttrID = dataConfig?.attributeID("topSplit")
      const rightSplitAttrID = dataConfig?.attributeID("rightSplit")
      const casePrimaryValue = primaryAttrID && dataset?.getStrValue(caseID, primaryAttrID)
      const caseTopSplitValue = topSplitAttrID && dataset?.getStrValue(caseID, topSplitAttrID)
      const caseRightSplitValue = rightSplitAttrID && dataset?.getStrValue(caseID, rightSplitAttrID)
      const caseLegendValue = legendAttrID && dataset?.getStrValue(caseID, legendAttrID)
      if (!primaryAttrID) return ""

      let tipText = ""
      const cellKey: Record<string, string> = {
        ...(!isHistogram && casePrimaryValue && {[primaryAttrID]: casePrimaryValue}),
        ...(caseTopSplitValue && {[topSplitAttrID]: caseTopSplitValue}),
        ...(caseRightSplitValue && {[rightSplitAttrID]: caseRightSplitValue})
      }
      const primaryMatches = self.matchingCasesForAttr(primaryAttrID, casePrimaryValue)
      const casesInSubPlot = dataConfig?.subPlotCases(cellKey) ?? []

      if (isHistogram) {
        const allMatchingCases = primaryMatches.filter(aCaseID => {
          if (topSplitAttrID) {
            const topSplitVal = dataset?.getStrValue(aCaseID.__id__, topSplitAttrID)
            if (topSplitVal !== caseTopSplitValue) return false
          }
          if (rightSplitAttrID) {
            const rightSplitVal = dataset?.getStrValue(aCaseID.__id__, rightSplitAttrID)
            if (rightSplitVal !== caseRightSplitValue) return false
          }
          return true
        })
        const { binWidth, minBinEdge } = self.binDetails()
        if (binWidth !== undefined) {
          const binIndex = Math.floor((Number(casePrimaryValue) - minBinEdge) / binWidth)
          const firstCount = allMatchingCases.length
          const secondCount = casesInSubPlot.length
          const percent = float(100 * firstCount / secondCount)
          const minBinValue = minBinEdge + binIndex * binWidth
          const maxBinValue = minBinEdge + (binIndex + 1) * binWidth
          // "<n> of <total> (<p>%) are ≥ L and < U"
          const attrArray = [firstCount, secondCount, percent, minBinValue, maxBinValue]
          const translationKey = firstCount === 1
            ? "DG.HistogramView.barTipNoLegendSingular"
            : "DG.HistogramView.barTipNoLegendPlural"
          tipText = t(translationKey, {vars: attrArray})
        }
      } else {
        const topSplitMatches = self.matchingCasesForAttr(topSplitAttrID, caseTopSplitValue)
        const rightSplitMatches = self.matchingCasesForAttr(rightSplitAttrID, caseRightSplitValue)
        const bothSplitMatches = topSplitMatches.filter(aCase => rightSplitMatches.includes(aCase))
        const legendMatches = legendAttrID
                                ? self.matchingCasesForAttr(legendAttrID, caseLegendValue, primaryMatches)
                                : []
        const totalCases = [
          legendMatches.length,
          bothSplitMatches.length,
          topSplitMatches.length,
          rightSplitMatches.length,
          dataset?.items.length ?? 0
        ].find(length => length > 0) ?? 0
        const legendMatchesInSubplot = legendAttrID
          ? casesInSubPlot.filter(aCaseID => dataset?.getStrValue(aCaseID, legendAttrID) === caseLegendValue).length
          :  0
        const caseCategoryString = caseLegendValue ? casePrimaryValue : ""
        const caseLegendCategoryString = caseLegendValue || casePrimaryValue
        const firstCount = legendAttrID ? legendMatchesInSubplot : casesInSubPlot.length
        const secondCount = legendAttrID ? casesInSubPlot.length : totalCases
        const percent = float(100 * firstCount / secondCount)
        // <n> of <m> <category> (<p>%) are <legend category>
        const attrArray = [ firstCount, secondCount, caseCategoryString, percent, caseLegendCategoryString ]
        const translationKey = legendAttrID
          ? firstCount === 1 ? "DG.BarChartModel.cellTipSingular" : "DG.BarChartModel.cellTipPlural"
          : firstCount === 1 ? "DG.BarChartModel.cellTipNoLegendSingular" : "DG.BarChartModel.cellTipNoLegendPlural"
        tipText = t(translationKey, {vars: attrArray})
      }

      return tipText
    },
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

      primaryAttrID && (dataConfig.getCaseDataArray(0) || []).forEach((aCaseData: CaseData) => {
        const anID = aCaseData.caseID,
          pValue = dataset?.getStrValue(anID, primaryAttrID) ?? '',
          pCat = catMap[pValue] ? pValue : kOther,
          sValue = secondaryAttrID ? dataset?.getStrValue(anID, secondaryAttrID) ?? '' : '',
          sCat = secondaryAttrID ? (catMap[pCat]?.[sValue] ? sValue : kOther) : kMain,
          extraPValue = extraPrimaryAttrID ? dataset?.getStrValue(anID, extraPrimaryAttrID) ?? '' : '',
          extraPCat = extraPrimaryAttrID ? (catMap[pCat]?.[sCat]?.[extraPValue] ? extraPValue : kOther) : kMain,
          extraSCatValue = extraSecondaryAttrID ? dataset?.getStrValue(anID, extraSecondaryAttrID) ?? '' : '',
          extraSCat = extraSecondaryAttrID ? (catMap[pCat]?.[sCat]?.[extraPCat]?.[extraSCatValue]
                                                ? extraSCatValue : kOther)
                                            : kMain
        if (pCat && sCat && extraPCat && extraSCat &&
          catMap[pCat]?.[sCat]?.[extraPCat]?.[extraSCat]) {
          const mapEntry = catMap[pCat][sCat][extraPCat][extraSCat]
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
          if (isBaseNumericAxisModel(axis)) {
            const numericValues = dataConfiguration.numericValuesForAttrRole(role)
            axis.setAllowRangeToShrink(true)
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
      self.setDataSet(dataSetID)
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
        self.pointsAreBinned = true
      } else if (configType !== "histogram") {
        if (configType !== "bars") {
          self.pointsFusedIntoBars = false
        }
        self.pointsAreBinned = false
      }
    },
    setPlotBackgroundColor(color: string) {
      self.plotBackgroundColor = color
    },
    setPlotBackgroundOpacity(opacity: number) {
      self.plotBackgroundOpacity = opacity
    },
    setIsTransparent(transparent: boolean) {
      self.isTransparent = transparent
    },
    setShowParentToggles(show: boolean) {
      self.showParentToggles = show
    },
    setShowOnlyLastCase(show: boolean) {
      self.showOnlyLastCase = show
    },
  }))
  .actions(self => ({
    displayOnlySelectedCases() {
      self.dataConfiguration.setDisplayOnlySelectedCases(true)
    },
    showAllCases() {
      self.dataConfiguration.clearHiddenCases()
      self.dataConfiguration.setDisplayOnlySelectedCases(false)
      self.rescale()
    },
    setBarCountAxis() {
      const { maxOverAllCells, maxCellLength, primaryRole, secondaryRole } = self.dataConfiguration
      const { binWidth, minValue, totalNumberOfBins } = self.binDetails()
      const secondaryPlace = secondaryRole === "y" ? "left" : "bottom"
      const extraPrimAttrRole = primaryRole === "x" ? "topSplit" : "rightSplit"
      const extraSecAttrRole = primaryRole === "x" ? "rightSplit" : "topSplit"
      const maxCellCaseCount = (self.pointDisplayType === "histogram" && binWidth !== undefined)
        ? maxCellLength(extraPrimAttrRole, extraSecAttrRole, binWidth, minValue, totalNumberOfBins)
        : maxOverAllCells(extraPrimAttrRole, extraSecAttrRole)
      const countAxis = NumericAxisModel.create({
        scale: "linear",
        place: secondaryPlace,
        min: 0,
        max: maxCellCaseCount,
        lockZero: true,
        integersOnly: true
      })
      setNiceDomain([0, maxCellCaseCount], countAxis, {clampPosMinAtZero: true})
      self.setAxis(secondaryPlace, countAxis)
    }
  }))
  .actions(self => ({
    setPointsFusedIntoBars(fuseIntoBars: boolean) {
      self.pointsFusedIntoBars = fuseIntoBars
    },
  }))
  .views(self => ({
    get noPossibleRescales() {
      return self.plotType !== 'casePlot' &&
        !AxisPlaces.find((axisPlace: AxisPlace) => {
          return isBaseNumericAxisModel(self.getAxis(axisPlace))
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
  .actions(applyModelChange)

export interface IGraphContentModel extends Instance<typeof GraphContentModel> {
}

export interface IGraphContentModelSnapshot extends SnapshotIn<typeof GraphContentModel> {
}

export function isGraphContentModel(model?: ITileContentModel): model is IGraphContentModel {
  return model?.type === kGraphTileType
}
