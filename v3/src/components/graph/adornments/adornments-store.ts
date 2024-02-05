import { Instance, types } from "mobx-state-tree"
import { IAdornmentContentInfo, getAdornmentContentInfo, getAdornmentTypes } from "./adornment-content-info"
import { IAdornmentComponentInfo, getAdornmentComponentInfo } from "./adornment-component-info"
import { AdornmentModelUnion, IMeasure, PlotTypes, kDefaultFontSize, measures } from "./adornment-types"
import { IAdornmentModel, IUpdateCategoriesOptions } from "./adornment-models"
import { kMovableLineType } from "./movable-line/movable-line-adornment-types"
import { kLSRLType } from "./lsrl/lsrl-adornment-types"
import { kMovableValueType } from "./movable-value/movable-value-adornment-types"
import { ScaleNumericBaseType } from "../../axis/axis-types"

interface IMeasureMenuItem {
  checked: boolean
  componentContentInfo?: IAdornmentContentInfo
  componentInfo?: IAdornmentComponentInfo
  disabled?: boolean
  title: string
  type: string
  clickHandler?: () => void
}

export const AdornmentsStore = types.model("AdornmentsStore", {
    type: "Adornments Store",
    adornments: types.array(AdornmentModelUnion),
    defaultFontSize: kDefaultFontSize,
    interceptLocked: false,
    showConnectingLines: false,
    showMeasureLabels: false,
    showSquaresOfResiduals: false
  })
  .actions(self => ({
    setDefaultFontSize(fontSize: number) {
      self.defaultFontSize = fontSize
    },
    toggleInterceptLocked() {
      self.interceptLocked = !self.interceptLocked
    },
    toggleShowConnectingLines() {
      self.showConnectingLines = !self.showConnectingLines
    },
    toggleShowLabels() {
      self.showMeasureLabels = !self.showMeasureLabels
    },
    toggleShowSquaresOfResiduals() {
      self.showSquaresOfResiduals = !self.showSquaresOfResiduals
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
  .views(self => ({
    isShowingAdornment(type: string) {
      return !!self.adornments.find(a => a.type === type)?.isVisible
    },
    get subPlotsHaveRegions() {
      const movableValueAdornment = self.adornments.find(a => a.type === kMovableValueType)
      const movableValues = movableValueAdornment?.values
      return movableValues?.size > 0
    },
    subPlotRegionBoundaries(key: string, scale: ScaleNumericBaseType) {
      // When Movable Values are present, they define regions within a sub-plot which may affect the behavior of other
      // adornments. The Count/Percent adornment, for example, will show a count/percent per region. This view can be
      // used by those adornments to determine the sub-region boundaries. The boundaries are simply the numeric values
      // of each movable value in addition to the primary axis' min and max values.
      const [ axisMin, axisMax ] = scale.domain() as [number, number]
      const movableValues = self.adornments.find(a => a.type === kMovableValueType)?.valuesForKey(key) ?? []
      const sortedBoundaryValues = [axisMin, ...movableValues, axisMax].sort((a: number, b: number) => a - b)
      return sortedBoundaryValues
    },
    get activeBannerCount() {
      return self.adornments.filter(adornment => {
        if (!adornment.isVisible) return false
        return getAdornmentComponentInfo(adornment.type)?.BannerComponent
      }).length
    }
  }))
  .views(self => ({
    getAdornmentsMenuItems(plotType: PlotTypes) {
      const registeredAdornments = getAdornmentTypes()
      const measureMenuItems: IMeasureMenuItem[] = []
      let addedConnectingLines = false
      let addedInterceptLocked = false
      let addedShowMeasureLabels = false
      let addedShowSquaresOfResiduals = false
      measures[plotType].map((measureOrGroup: IMeasure) => {
        const { title, type } = measureOrGroup
        const checked = self.isShowingAdornment(type)
        const registeredAdornment = registeredAdornments.find(a => a.type === type)
        const isUnivariateMeasure = registeredAdornment?.parentType === "Univariate Measure"
        // Add the Show Measure Labels option checkbox immediately before the first univariate measure adornment's
        // checkbox. Since the Show Measure Labels option isn't for activating an adornment, but rather for
        // modifying the behavior of other adornments, it doesn't have an associated registeredAdornment. So we nee
        //  to add it like this.
        if (isUnivariateMeasure && !addedShowMeasureLabels) {
          measureMenuItems.push({
            checked: self.showMeasureLabels,
            title: "DG.Inspector.showLabels",
            type: "control",
            clickHandler: self.toggleShowLabels
          })
          addedShowMeasureLabels = true
        }
        const componentInfo = registeredAdornment ? getAdornmentComponentInfo(type) : undefined
        const componentContentInfo = registeredAdornment ? getAdornmentContentInfo(type) : undefined
        measureMenuItems.push({
          checked,
          componentInfo,
          componentContentInfo,
          title,
          type
        })
        // Add the Connecting Lines checkbox immediately after the Count/Percent checkbox(es). That setting will be used
        // by the ScatterDots component to determine whether to show connecting lines.
        if (
          plotType === "scatterPlot" && registeredAdornment?.type === "Count" && !addedConnectingLines
        ) {
          measureMenuItems.push({
            checked: self.showConnectingLines,
            title: "DG.Inspector.graphConnectingLine",
            type: "control",
            clickHandler: self.toggleShowConnectingLines
          })
          addedConnectingLines = true
        }
        // Add the Intercept Locked option checkbox immediately after the LSRL checkbox. Since the Intercept Locked
        // option isn't for activating an adornment, but rather for modifying the behavior of other adornments, it
        // doesn't have an associated registeredAdornment. So we need to add it like this.
        if (
          registeredAdornment?.type === "LSRL" &&
          plotType === "scatterPlot" && !addedInterceptLocked
        ) {
          const movableLineVisible = self.isShowingAdornment(kMovableLineType)
          const lsrlVisible = self.isShowingAdornment(kLSRLType)
          const disabled = !movableLineVisible && !lsrlVisible
          measureMenuItems.push({
            checked: self.interceptLocked,
            disabled,
            title: "DG.Inspector.graphInterceptLocked",
            type: "control",
            clickHandler: self.toggleInterceptLocked
          })
          addedInterceptLocked = true
        }
      })
      if (
        plotType === "scatterPlot" && !addedShowSquaresOfResiduals
      ) {
        const movableLineVisible = !!self.adornments.find(a => a.type === "Movable Line")?.isVisible
        const lsrlVisible = !!self.adornments.find(a => a.type === "LSRL")?.isVisible
        const disabled = !movableLineVisible && !lsrlVisible
        measureMenuItems.push({
          checked: self.showSquaresOfResiduals,
          disabled,
          title: "DG.Inspector.graphSquares",
          type: "control",
          clickHandler: self.toggleShowSquaresOfResiduals
        })
        addedShowSquaresOfResiduals = true
      }

      return measureMenuItems
    },
    get activeUnivariateMeasures() {
      return self.adornments.filter(adornment => adornment.isUnivariateMeasure && adornment.isVisible)
    },
    findAdornmentOfType<T extends IAdornmentModel = IAdornmentModel>(type: string): T | undefined {
      return self.adornments.find(adornment => adornment.type === type) as T
    }
  }))
  .actions(self => ({
    addAdornment(adornment: IAdornmentModel, options: IUpdateCategoriesOptions) {
      self.hideAdornment(adornment.type)
      adornment.updateCategories(options)
      self.showAdornment(adornment, adornment.type)
    },
    updateAdornment(callback: () => void) {
      callback()
    },
    updateAdornments(options: IUpdateCategoriesOptions) {
      self.adornments.forEach(adornment => adornment.updateCategories(options))
    },
  }))

export interface IAdornmentsStore extends Instance<typeof AdornmentsStore> {}
