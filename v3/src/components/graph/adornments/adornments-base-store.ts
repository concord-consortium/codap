import {Instance, types} from "mobx-state-tree"
import {getAdornmentComponentInfo} from "./adornment-component-info"
import {AdornmentModelUnion, kDefaultFontSize} from "./adornment-types"
import {IAdornmentModel, IUpdateCategoriesOptions} from "./adornment-models"
import {kMovableValueType} from "./movable-value/movable-value-adornment-types"
import {ScaleNumericBaseType} from "../../axis/axis-types"

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
    const [axisMin, axisMax] = scale.domain() as [number, number]
    const movableValues = self.adornments.find(a => a.type === kMovableValueType)?.valuesForKey(key) ?? []
    return [axisMin, ...movableValues, axisMax].sort((a: number, b: number) => a - b)
  },
  get activeBannerCount() {
    return self.adornments.filter(adornment => {
      if (!adornment.isVisible) return false
      return getAdornmentComponentInfo(adornment.type)?.BannerComponent
    }).length
  }
}))
.views(self => ({
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

export interface IAdornmentsBaseStore extends Instance<typeof AdornmentsBaseStore> {
}
