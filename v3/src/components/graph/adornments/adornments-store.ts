import { Instance, types } from "mobx-state-tree"
import { IAdornmentContentInfo, getAdornmentContentInfo, getAdornmentTypes } from "./adornment-content-info"
import { IAdornmentComponentInfo, getAdornmentComponentInfo } from "./adornment-component-info"
import { AdornmentModelUnion, IMeasure, PlotTypes, measures } from "./adornment-types"
import { IAdornmentModel, IUpdateCategoriesOptions } from "./adornment-models"
import { kMovableLineType } from "./movable-line/movable-line-adornment-types"
import { kLSRLType } from "./lsrl/lsrl-adornment-types"

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
    interceptLocked: false,
    showMeasureLabels: false
  })
  .actions(self => ({
    toggleInterceptLocked() {
      self.interceptLocked = !self.interceptLocked
    },
    toggleShowLabels() {
      self.showMeasureLabels = !self.showMeasureLabels
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
    }
  }))
  .views(self => ({
    getAdornmentsMenuItems(plotType: PlotTypes) {
      const registeredAdornments = getAdornmentTypes()
      const measureMenuItems: IMeasureMenuItem[] = []
      let addedInterceptLocked = false
      let addedShowMeasureLabels = false
      measures[plotType].map((measure: IMeasure) => {
        const { title, type } = measure
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

export interface IAdornmentsController extends Instance<typeof AdornmentsStore> {}
