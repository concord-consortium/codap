import { Instance, types } from "mobx-state-tree"
import { IAdornmentContentInfo, getAdornmentContentInfo, getAdornmentTypes } from "./adornment-content-info"
import { IAdornmentComponentInfo, getAdornmentComponentInfo } from "./adornment-component-info"
import { AdornmentModelUnion, IMeasure, PlotTypes, measures } from "./adornment-types"
import { IAdornmentModel, IUpdateCategoriesOptions } from "./adornment-models"
import t from "../../../utilities/translation/translate"

interface IMeasureMenuItem {
  checked: boolean
  componentContentInfo?: IAdornmentContentInfo
  componentInfo?: IAdornmentComponentInfo
  title: string
  type: string
  clickHandler?: () => void
}

export const AdornmentsStore = types.model("AdornmentsStore", {
    type: "Adornments Store",
    adornments: types.array(AdornmentModelUnion),
    showMeasureLabels: false
  })
  .volatile(self => ({
    activeUnivariateMeasures: [] as string[]
  }))
  .actions(self => ({
    toggleShowLabels() {
      self.showMeasureLabels = !self.showMeasureLabels
    },
    addActiveUnivariateMeasure(measure: string) {
      const activeUnivariateMeasures = [...self.activeUnivariateMeasures]
      activeUnivariateMeasures.push(measure)
      self.activeUnivariateMeasures = activeUnivariateMeasures
    },
    removeActiveUnivariateMeasure(measure: string) {
      const activeUnivariateMeasures = [...self.activeUnivariateMeasures]
      const index = activeUnivariateMeasures.indexOf(measure)
      if (index > -1) {
        activeUnivariateMeasures.splice(index, 1)
      }
      self.activeUnivariateMeasures = activeUnivariateMeasures
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
    getAdornmentsMenuItems(plotType: PlotTypes) {
      const registeredAdornments = getAdornmentTypes()
      const measureMenuItems: IMeasureMenuItem[] = []
      let addedShowMeasureLabels = false
      measures[plotType].map((measure: IMeasure) => {
        const { title, type } = measure
        const checked = !!self.adornments.find(a => a.type === type)?.isVisible
        const registeredAdornment = registeredAdornments.find(a => a.type === title)
        const isUnivariateMeasure = registeredAdornment?.subTypeOf === "Univariate Measure"
        if (isUnivariateMeasure && !addedShowMeasureLabels) {
          measureMenuItems.push({
            checked: self.showMeasureLabels,
            title: t("DG.Inspector.showLabels"),
            type: "control",
            clickHandler: self.toggleShowLabels
          })
          addedShowMeasureLabels = true
        }
        const componentInfo = registeredAdornment ? getAdornmentComponentInfo(title) : undefined
        const componentContentInfo = registeredAdornment ? getAdornmentContentInfo(title) : undefined
        measureMenuItems.push({
          checked,
          componentInfo,
          componentContentInfo,
          title,
          type
        })
      })

      return measureMenuItems
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
