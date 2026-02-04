import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { applyModelChange } from "../../../../models/history/apply-model-change"
import { getAdornmentComponentInfo } from "../adornment-component-info"
import { AdornmentModelUnion, kDefaultFontSize } from "../adornment-types"
import { IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { IMovableValueAdornmentModel } from "../movable-value/movable-value-adornment-model"
import { kMovableValueType } from "../movable-value/movable-value-adornment-types"
import { isUnivariateMeasureAdornment, IUnivariateMeasureAdornmentModel }
  from "../univariate-measures/univariate-measure-adornment-model"
import { kNormalCurveType } from "../univariate-measures/normal-curve/normal-curve-adornment-types"
import { kStandardErrorType } from "../univariate-measures/standard-error/standard-error-adornment-types"

/**
 * The AdornmentsBaseStore is a model that manages the adornments that are displayed on a graph. It provides methods for
 * showing and hiding adornments, and for updating the categories of the adornments.
 */
export const AdornmentsBaseStore = types.model("AdornmentsBaseStore", {
  adornments: types.array(AdornmentModelUnion),
  defaultFontSize: kDefaultFontSize,
  interceptLocked: false,
  showConnectingLines: false,
  showMeasureLabels: false,
  showSquaresOfResiduals: false
})
.views(self => ({
  isShowingAdornment(type: string) {
    return !!self.adornments.find(a => a.type === type)?.isVisible
  },
  get activeUnivariateMeasures() {
    return self.adornments.filter(adornment => adornment.isUnivariateMeasure && adornment.isVisible) as
            IUnivariateMeasureAdornmentModel[]
  },
  mapOfUnivariateAdornmentVisibility() {
    const map = new Map<string, { isVisible: boolean, needsRecomputation: boolean }>()
    self.adornments.forEach(adornment => {
      if (isUnivariateMeasureAdornment(adornment)) {
        map.set(adornment.type, {isVisible: adornment.isVisible, needsRecomputation: adornment.needsRecomputation})
      }
    })
    return map
  },
  findAdornmentOfType<T extends IAdornmentModel = IAdornmentModel>(type: string): T | undefined {
    return self.adornments.find(adornment => adornment.type === type) as T
  },
  getLabelLinesAboveAdornment(adornment: IAdornmentModel, isGaussianFit: boolean = false) {
    let lines = 0, found = false
    self.adornments.forEach((a) => {
      if (a.isVisible && !found) {
        if (a === adornment) {
          found = true
        } else {
          // The gaussian fit adornment gets an extra line for the title of its label
          // and an extra line if showing the standard error
          lines += a.labelLines + (isGaussianFit && a.type === kNormalCurveType
            ? 1 + (this.isShowingAdornment(kStandardErrorType) ? 1 : 0)
            : 0)
        }
        const componentInfo = getAdornmentComponentInfo(a.type)
        if (componentInfo?.BannerComponent) {
          lines += 1
        }
      }
    })
    return lines
  }
}))
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
  setShowConnectingLines(show: boolean) {
    self.showConnectingLines = show
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
  sortedMovableValues(instanceKey?: string) {
    const movableValueAdornment = self.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    return movableValueAdornment?.isVisible ? movableValueAdornment?.sortedValues(instanceKey) ?? [] : []
  },
  get movableValuesAreShowing() {
    const movableValueAdornment = self.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    return !!(movableValueAdornment?.isVisible && movableValueAdornment?.values?.size)
  },
  get subPlotsHaveRegions() {
    const movableValueAdornment = self.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    const movableValues = movableValueAdornment?.values
    return !!movableValues?.size
  },
  subPlotRegionBoundaries(key: string) {
    // When Movable Values are present, they define regions within a sub-plot which may affect the behavior of other
    // adornments. The Count/Percent adornment, for example, will show a count/percent per region. This view can be
    // used by those adornments to determine the sub-region boundaries.
    const movableValueAdornment = self.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    const movableValues = movableValueAdornment?.valuesForKey(key) ?? []
    return [-Infinity, ...movableValues, Infinity].sort((a: number, b: number) => a - b)
  },
  get activeBannerCount() {
    return self.adornments.filter(adornment => {
      if (!adornment.isVisible) return false
      return getAdornmentComponentInfo(adornment.type)?.BannerComponent
    }).length
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
  .actions(applyModelChange)

export interface IAdornmentsBaseStore extends Instance<typeof AdornmentsBaseStore> {}
export interface IAdornmentsBaseStoreSnapshot extends SnapshotIn<typeof AdornmentsBaseStore> {}
