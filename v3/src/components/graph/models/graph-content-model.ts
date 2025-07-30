/**
 * A GraphContentModel is the top level model for the Graph component.
 * Its array of DataDisplayLayerModels has just one element, a GraphPointLayerModel.
 */
import {isEqual} from "lodash"
import { comparer, reaction, when } from "mobx"
import { addDisposer, getSnapshot, Instance, SnapshotIn, types } from "mobx-state-tree"
import { isCategoricalAttributeType, isNumericAttributeType } from "../../../models/data/attribute-types"
import {IDataSet} from "../../../models/data/data-set"
import {applyModelChange} from "../../../models/history/apply-model-change"
import { getTileCaseMetadata, getTileDataSet } from "../../../models/shared/shared-data-tile-utils"
import { getDataSetFromId, getMetadataFromDataSet } from "../../../models/shared/shared-data-utils"
import {ISharedModel} from "../../../models/shared/shared-model"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import { getFormulaManager } from "../../../models/tiles/tile-environment"
import {typedId} from "../../../utilities/js-utils"
import {mstAutorun} from "../../../utilities/mst-autorun"
import { mstReaction } from "../../../utilities/mst-reaction"
import { setNiceDomain } from "../../axis/axis-domain-utils"
import {GraphPlace} from "../../axis-graph-shared"
import {AxisPlace, AxisPlaces, IAxisTicks, ScaleNumericBaseType, TickFormatter} from "../../axis/axis-types"
import { EmptyAxisModel, IAxisModel, IAxisModelSnapshot } from "../../axis/models/axis-model"
import {
  AxisModelUnion, IAxisModelSnapshotUnion, IAxisModelUnion, isAxisModelInUnion
} from "../../axis/models/axis-model-union"
import {
  INumericAxisModelSnapshot, isAnyNumericAxisModel, isPercentAxisModel
} from "../../axis/models/numeric-axis-models"
import { CaseData } from "../../data-display/d3-types"
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {
  attrRoleToAxisPlace, axisPlaceToAttrRole, GraphAttrRole, kMain, kOther, PrimaryAttrRoles
} from "../../data-display/data-display-types"
import { computePointRadius } from "../../data-display/data-display-utils"
import { IGetTipTextProps } from "../../data-display/data-tip-types"
import {IAdornmentModel, IUpdateCategoriesOptions} from "../adornments/adornment-models"
import {AdornmentsStore} from "../adornments/store/adornments-store"
import { isUnivariateMeasureAdornment } from "../adornments/univariate-measures/univariate-measure-adornment-model"
import {kGraphTileType} from "../graph-defs"
import { CatMapType, CellType, PlotType } from "../graphing-types"
import { CasePlotModel } from "../plots/case-plot/case-plot-model"
import { IPlotGraphApi } from "../plots/plot-model"
import { IPlotModelUnionSnapshot, PlotModelUnion } from "../plots/plot-model-union"
import {IGraphDataConfigurationModel} from "./graph-data-configuration-model"
import {GraphPointLayerModel, IGraphPointLayerModel, kGraphPointLayerType} from "./graph-point-layer-model"

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
    plot: types.optional(PlotModelUnion, () => CasePlotModel.create()),
    plotBackgroundImage: types.maybe(types.string),
    plotBackgroundImageLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
    // Plots can have a background whose properties are described by this property.
    plotBackgroundLockInfo: types.maybe(types.frozen<BackgroundLockInfo>()),
    // numberToggleModel: types.optional(types.union(NumberToggleModel, null))
    showParentToggles: false,
    showOnlyLastCase: types.maybe(types.boolean),
    // TODO: numberOfLegendQuantiles and legendQuantilesAreLocked are imported from V2
    // but have not been implemented in V3
    numberOfLegendQuantiles: types.maybe(types.number),
    legendQuantilesAreLocked: types.maybe(types.boolean)
  })
  .volatile(() => ({
    changeCount: 0, // used to notify observers when something has changed that may require a re-computation/redraw
    prevDataSetId: "",
    pointOverlap: 0,  // Set by plots so that it is accessible to adornments,
    plotGraphApi: undefined as Maybe<IPlotGraphApi>
  }))
  // cast required to avoid self-reference in model definition error
  .preProcessSnapshot(preProcessSnapshot as any)
  .actions(self => ({
    addLayer(aLayer: IGraphPointLayerModel) {
      self.layers.push(aLayer)
    },
    setPointOverlap(overlap: number) {
      self.pointOverlap = overlap
    }
  }))
  .views(self => ({
    get plotType() {
      return self.plot.type
    },
    get pointsFusedIntoBars() {
      return self.plot.hasPointsFusedIntoBars
    },
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
    }
  }))
  .views(self => ({
    get primaryPlace() {
      return self.dataConfiguration?.primaryRole === "y" ? "left" : "bottom"
    },
    get secondaryPlace() {
      return self.dataConfiguration?.secondaryRole === "x" ? "bottom" : "left"
    },
    get primaryAxis() {
      return this.getAxis(this.primaryPlace)
    },
    get secondaryAxis() {
      return this.getAxis(this.secondaryPlace)
    },
    get secondaryAxisIsPercent() {
      return isPercentAxisModel(this.secondaryAxis)
    },
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    },
    getNumericAxis(place: AxisPlace) {
      const axis = self.axes.get(place)
      // Include DataAxisModels
      return isAnyNumericAxisModel(axis) ? axis : undefined
    },
    getAttributeID(place: GraphAttrRole) {
      return self.dataConfiguration.attributeID(place) ?? ''
    },
    axisShouldShowGridLines(place: AxisPlace) {
      return ["left", "bottom"].includes(place) && self.plot.showGridLines
    },
    axisShouldShowZeroLine(place: AxisPlace) {
      return ['left', 'bottom'].includes(place) && self.plot.showZeroLine
    },
    placeCanAcceptAttributeIDDrop(place: GraphPlace,
                                  dataset: IDataSet | undefined,
                                  attributeID: string | undefined): boolean {
      return self.dataConfiguration.placeCanAcceptAttributeIDDrop(place, dataset, attributeID)
    }
  }))
  .views(self => ({
    getSecondaryNumericAxis() {
      return self.getNumericAxis(self.dataConfiguration.secondaryRole === "x" ? "bottom" : "left")
    },
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
    setAxis(place: AxisPlace, axis: IAxisModel) {
      if (isAxisModelInUnion(axis)) {
        self.axes.set(place, axis)
      }
    },
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

      // When a univariate adornment becomes visible and needs to be recomputed, update it
      addDisposer(self, reaction(
        () => self.adornmentsStore.mapOfUnivariateAdornmentVisibility(),
        (adornmentMap) => {
          adornmentMap.forEach(({isVisible, needsRecomputation}, type) => {
            if (isVisible && needsRecomputation) {
              const adornment = self.adornmentsStore.findAdornmentOfType(type)
              if (adornment && isUnivariateMeasureAdornment(adornment)) {
                adornment.updateCategories(self.getUpdateCategoriesOptions())
                // MobX prevents reactions from re-triggering their accessor functions to prevent infinite loops
                // setTimeout allows us re-trigger the reaction after the current event loop
                // infinite loop is prevented by the needsRecomputation test
                setTimeout(() => adornment.setNeedsRecomputation(false))
              }
            }
          })
        },
        { name: "GraphContentModel.afterAttachToDocument.reactToVisibilityChange", equals: comparer.structural }
      ))
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
      self.plotGraphApi = {
        getSecondaryAxisModel() {
          return self.getAxis(self.dataConfiguration.secondaryRole === "x" ? "bottom" : "left")
        },
        setSecondaryAxisModel(axisModel?: IAxisModel) {
          const place = self.dataConfiguration.secondaryRole === "x" ? "bottom" : "left"
          if (axisModel) {
            self.setAxis(place, axisModel)
          }
          else {
            self.axes.delete(place)
          }
        }
      }
      addDisposer(self, reaction(
        () => self.plotType,
        () => self.plot.setGraphContext(self.dataConfiguration, self.plotGraphApi),
        { name: "GraphContentModel.afterCreate.setGraphContext", fireImmediately: true }
      ))
    },
    beforeDestroy() {
      self.formulaAdapters.forEach(adapter => {
        adapter?.removeContentModel(self.id)
      })
    }
  }))
  .actions(self => ({
    updateAfterSharedModelChanges(sharedModel: ISharedModel | undefined) {
    },
    setDataSet(dataSetID: string) {
      const newDataSet = getDataSetFromId(self, dataSetID)
      if (newDataSet && newDataSet !== self.dataConfiguration.dataset) {
        self.dataConfiguration.clearAttributes()
        self.dataConfiguration.setDataset(newDataSet, getMetadataFromDataSet(newDataSet))
      }
    },
    setPlot(newPlotSnap: IPlotModelUnionSnapshot) {
      const currPlotSnap = getSnapshot(self.plot)
      if (!isEqual(newPlotSnap, currPlotSnap)) {
        const prevPlotWasBinned = self.plot.isBinned
        self.plot = PlotModelUnion.create({ ...currPlotSnap, ...newPlotSnap })
        if (self.dataConfiguration) {
          self.plot.setGraphContext(self.dataConfiguration, self.plotGraphApi)
          self.plot.resetSettings({ isBinnedPlotChanged: prevPlotWasBinned !== self.plot.isBinned })
        }
      }
    },
    setPlotType(type: PlotType) {
      if (type !== self.plot.type) {
        this.setPlot({ type })
      }
    }
  }))
  .views(self => ({
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
      return computePointRadius(self.dataConfiguration.getCaseDataArray(0).length,
        self.pointDescription.pointSizeMultiplier, use)
    },
    hasBinnedNumericAxis(axisModel: IAxisModel): boolean {
      return isAnyNumericAxisModel(axisModel) && self.plot.hasBinnedNumericAxis
    },
    hasDraggableNumericAxis(axisModel: IAxisModel): boolean {
      return isAnyNumericAxisModel(axisModel) && self.plot.hasDraggableNumericAxis
    },
    nonDraggableAxisTicks(formatter: TickFormatter): IAxisTicks {
      return self.plot.nonDraggableAxisTicks(formatter)
    }
  }))
  .views(self => ({
    fusedCasesTipText(caseID: string, legendAttrID?: string) {
      const dataConfig = self.dataConfiguration
      const dataset = dataConfig.dataset
      const isHistogram = self.plotType === "histogram"
      const primaryRole = dataConfig?.primaryRole
      const primaryAttrID = primaryRole && dataConfig?.attributeID(primaryRole)
      const topSplitAttrID = dataConfig?.attributeID("topSplit")
      const rightSplitAttrID = dataConfig?.attributeID("rightSplit")
      const casePrimaryValue = primaryAttrID && dataset?.getStrValue(caseID, primaryAttrID)
      const caseTopSplitValue = topSplitAttrID && dataset?.getStrValue(caseID, topSplitAttrID)
      const caseRightSplitValue = rightSplitAttrID && dataset?.getStrValue(caseID, rightSplitAttrID)
      const caseLegendValue = legendAttrID && dataset?.getStrValue(caseID, legendAttrID)
      if (!primaryAttrID) return ""

      const cellKey: Record<string, string> = {
        ...(!isHistogram && casePrimaryValue && {[primaryAttrID]: casePrimaryValue}),
        ...(caseTopSplitValue && {[topSplitAttrID]: caseTopSplitValue}),
        ...(caseRightSplitValue && {[rightSplitAttrID]: caseRightSplitValue})
      }
      const primaryMatches = self.plot.matchingCasesForAttr(primaryAttrID, casePrimaryValue)
      const casesInSubPlot = dataConfig?.subPlotCases(cellKey) ?? []

      return self.plot.barTipText({
        primaryMatches, casesInSubPlot, casePrimaryValue, legendAttrID, caseLegendValue,
        topSplitAttrID, caseTopSplitValue, rightSplitAttrID, caseRightSplitValue
      })
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
          if (isAnyNumericAxisModel(axis)) {
            const epRole = dataConfiguration.primaryRole === 'x' ? 'topSplit' : 'rightSplit'
            const esRole = dataConfiguration.primaryRole === 'x' ? 'rightSplit' : 'topSplit'
            const numericValues = self.plotType === 'barChart'
              ? [0, dataConfiguration.maxOverAllCells(epRole, esRole)]
              : dataConfiguration.numericValuesForAttrRole(role)
            axis.setAllowRangeToShrink(true)
            setNiceDomain(numericValues, axis, self.plot.axisDomainOptions)
          }
        })
      }
    },
    removeAxis(place: AxisPlace) {
      self.axes.delete(place)
    },
    setAttributeID(role: GraphAttrRole, dataSetID: string, attributeID: string) {
      const prevPrimaryRole = self.dataConfiguration.primaryRole
      const prevPrimaryAttrId = prevPrimaryRole ? self.dataConfiguration.attributeID(prevPrimaryRole) : undefined
      self.setDataSet(dataSetID)
      if (role === 'yPlus') {
        self.dataConfiguration.addYAttribute({attributeID})
      } else {
        self.dataConfiguration.setAttribute(role, {attributeID})
      }
      const newPrimaryRole = self.dataConfiguration.primaryRole
      const newPrimaryAttrId = newPrimaryRole ? self.dataConfiguration.attributeID(newPrimaryRole) : undefined
      self.plot.resetSettings({
        primaryRoleChanged: prevPrimaryRole !== newPrimaryRole,
        primaryAttrChanged: prevPrimaryAttrId !== newPrimaryAttrId
      })

      const updateCategoriesOptions = self.getUpdateCategoriesOptions(true)
      self.adornmentsStore.updateAdornments(updateCategoriesOptions)
    },
    setGraphProperties(props: GraphProperties) {
      (Object.keys(props.axes) as AxisPlace[]).forEach(aKey => {
        self.setAxis(aKey, props.axes[aKey])
      })
      self.setPlotType(props.plotType)
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
    }
  }))
  .actions(self => ({
    configureUnivariateNumericPlot(display: "points" | "bars", isBinned = false) {
      let newPlotType: Maybe<PlotType>
      if (isBinned) {
        newPlotType = display === "points" ? "binnedDotPlot" : "histogram"
      }
      else if (display === "points") {
        newPlotType = "dotPlot"
      }
      else {
        newPlotType = "linePlot"
      }
      self.setPlotType(newPlotType)
    },
    fusePointsIntoBars(fuseIntoBars: boolean) {
      if (fuseIntoBars !== (self.plot.displayType === "bars")) {
        const transformMap: Partial<Record<PlotType, PlotType>> = {
          dotChart: "barChart",
          barChart: "dotChart",
          binnedDotPlot: "histogram",
          histogram: "binnedDotPlot"
        }
        const newPlotType = transformMap[self.plotType]
        if (newPlotType) {
          self.setPlotType(newPlotType)
          const secondaryRole = self.dataConfiguration.secondaryRole
          const secondaryPlace = self.secondaryPlace
          const secondaryType = secondaryRole ? self.dataConfiguration.attributeType(secondaryRole) : undefined
          const secondaryAxis = self.getAxis(secondaryPlace)
          const newSecondaryAxis = self.plot.getValidSecondaryAxis(secondaryPlace, secondaryType, secondaryAxis)
          // add/remove count axis if necessary
          if (newSecondaryAxis !== secondaryAxis) {
            self.setAxis(secondaryPlace, newSecondaryAxis)
          }
        }
      }
    },
    syncPrimaryRoleWithAttributeConfiguration() {
      const currPrimaryRole = self.dataConfiguration.primaryRole ?? "x"
      const currSecondaryRole = self.dataConfiguration.secondaryRole ?? "y"
      const primaryAttributeType = currPrimaryRole
                                    ? self.dataConfiguration.attributeType(currPrimaryRole)
                                    : undefined
      const secondaryAttributeType = currSecondaryRole
                                      ? self.dataConfiguration.attributeType(currSecondaryRole)
                                      : undefined
      // Numeric attributes get priority for primaryRole when present. First one that is already present
      // and then the newly assigned one. If there is an already assigned categorical then its place is
      // the primaryRole, or, lastly, the newly assigned place.
      const newPrimaryRole = isNumericAttributeType(primaryAttributeType)
                              ? currPrimaryRole
                              : isNumericAttributeType(secondaryAttributeType)
                                  ? currSecondaryRole
                                  : primaryAttributeType
                                    ? currPrimaryRole
                                    : secondaryAttributeType
                                      ? currSecondaryRole
                                      : undefined
      if (newPrimaryRole !== self.dataConfiguration.primaryRole) {
        self.dataConfiguration.setPrimaryRole(newPrimaryRole as Maybe<GraphAttrRole>)
      }
    },
    // returns true if the plot type changed
    syncPlotWithAttributeConfiguration(): boolean {
      const assignedAttrCount = PrimaryAttrRoles.map(role => !!self.dataConfiguration.attributeID(role))
                                  .filter(Boolean).length
      if (assignedAttrCount === 0) {
        if (self.plotType !== "casePlot") {
          self.setPlotType("casePlot")
          return true
        }
        return false
      }

      function isNumericRole(role: GraphAttrRole) {
        return isNumericAttributeType(self.dataConfiguration.attributeType(role))
      }
      function isCategoricalRole(role?: GraphAttrRole) {
        return !!role && isCategoricalAttributeType(self.dataConfiguration.attributeType(role))
      }
      const numericAttrCount = PrimaryAttrRoles.map(role => isNumericRole(role))
                                  .filter(Boolean).length
      let newPlotType: Maybe<PlotType>
      if (numericAttrCount === 0) {
        const secondaryAttrIsCategorical = isCategoricalRole(self.dataConfiguration.secondaryRole)
        if (!self.plot.isCategorical || (self.plotType === "barChart" && secondaryAttrIsCategorical)) {
          newPlotType = "dotChart"
        }
      }
      else if (numericAttrCount === 1) {
        if (!self.plot.isUnivariateNumeric) {
          newPlotType = "dotPlot"
        }
      }
      else if (numericAttrCount > 1) {
        if (!self.plot.isBivariateNumeric) {
          newPlotType = "scatterPlot"
        }
      }
      if (newPlotType) {
        self.setPlotType(newPlotType)
        return true
      }
      return false
    }
  }))
  .views(self => ({
    get noPossibleRescales() {
      return self.plotType !== 'casePlot' &&
        !AxisPlaces.find((axisPlace: AxisPlace) => {
          return isAnyNumericAxisModel(self.getAxis(axisPlace))
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

/*
 * Legacy snapshot processing (pre-plot model refactor)
 */
type LegacyPointDisplayType = "points" | "bars" | "bins" | "histogram"
interface LegacyGraphContentModelSnapshot extends Omit<SnapshotIn<typeof GraphContentModel>, "plot"> {
  pointDisplayType?: LegacyPointDisplayType
  plotType?: "casePlot" | "dotPlot" | "dotChart" | "scatterPlot"
  // some properties were historically written out as null because NaN => null in JSON
  _binAlignment?: number | null
  _binWidth?: number | null
  pointsAreBinned?: boolean
  pointsFusedIntoBars?: boolean
}

function isLegacyCountAxis(axis?: IAxisModelSnapshot): axis is INumericAxisModelSnapshot {
  return axis?.type === "numeric" && "lockZero" in axis && !!axis.lockZero
}

function isLegacyGraphContentModelSnapshot(snap: unknown): snap is LegacyGraphContentModelSnapshot {
  return !!snap && typeof snap === "object" &&
          ("plotType" in snap || "pointDisplayType" in snap) &&
          !("plot" in snap)
}

function preProcessSnapshot(
  snap: LegacyGraphContentModelSnapshot | IGraphContentModelSnapshot
): IGraphContentModelSnapshot {
  let newSnap: IGraphContentModelSnapshot = snap
  if (isLegacyGraphContentModelSnapshot(snap)) {
    const {
      axes, pointDisplayType, plotType, _binAlignment, _binWidth, pointsAreBinned, pointsFusedIntoBars, ...others
    } = snap
    switch (plotType) {
      case "dotPlot": {
        const displayTypeToPlotTypeMap: Record<LegacyPointDisplayType, PlotType> = {
          points: "dotPlot",
          bars: "linePlot",
          bins: "binnedDotPlot",
          histogram: "histogram"
        }
        const binProps = pointsAreBinned && _binAlignment != null && _binWidth != null
                          ? { _binAlignment, _binWidth }
                          : {}
        newSnap = {
          ...others,
          plot: {
            type: displayTypeToPlotTypeMap[pointDisplayType ?? "points"] ?? "dotPlot",
            ...binProps
          }
        }
        break
      }
      case "dotChart":
        newSnap = {
          ...others,
          plot: { type: pointsFusedIntoBars ? "barChart" : "dotChart" }
        }
        break
      case "scatterPlot":
        newSnap = {
          ...others,
          plot: { type: "scatterPlot" }
        }
        break
      case "casePlot":
      default:
        newSnap = {
          ...others,
          plot: { type: "casePlot" }
      }
    }
    // convert legacy count axes to current count axes
    const newAxes: Partial<Record<AxisPlace, IAxisModelSnapshotUnion>> = {}
    if (isLegacyCountAxis(axes?.left)) {
      newAxes.left = { ...axes.left, type: "count" }
    }
    if (isLegacyCountAxis(axes?.bottom)) {
      newAxes.bottom = { ...axes.bottom, type: "count" }
    }
    newSnap.axes = { ...axes, ...newAxes }
  }
  return newSnap
}
