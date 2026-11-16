import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult, DIErrorResult }
  from "../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../models/graph-content-model"
import { getAdornmentContentInfo, isCompatibleWithPlotType } from "../adornment-content-info"
import { IAdornmentModel } from "../adornment-models"
import { IAdornmentsBaseStore } from "../store/adornments-base-store"

export interface IAdornmentWriteConfig {
  adornmentType: string
  // the adornment's `get` values, with which `create` also replies
  get: (adornment: IAdornmentModel, graphContent: IGraphContentModel) => Record<string, any>
  // an error for `create` or `update` values the type can't accept, checked before anything changes
  validate?: (values: Record<string, unknown>) => DIErrorResult | undefined
  // sets the type's own settings from `create` or `update` values
  applyValues?: (adornment: IAdornmentModel, values: Record<string, unknown>, graphContent: IGraphContentModel) => void
}

// `create` and `update` for an adornment with no per-cell values to supply: `create` shows the adornment,
// adding it to the graph if it has never been shown, and `update` sets its visibility. Both apply the type's
// own settings.
export const adornmentWriteHandlers = (
  { adornmentType, get, validate, applyValues }: IAdornmentWriteConfig
): Pick<DIAdornmentHandler, "create" | "update"> => ({
  create({ graphContent, values }) {
    if (!isCompatibleWithPlotType(adornmentType, graphContent.plotType)) return adornmentNotSupportedByPlotTypeResult
    const settings = valuesObject(values)
    const error = settings && validate?.(settings)
    if (error) return error

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingAdornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(adornmentType)
    const adornment = existingAdornment ?? getAdornmentContentInfo(adornmentType).modelClass.create()

    if (!existingAdornment) {
      // the axes let a movable line or point take the starting position the inspector gives it
      adornmentsStore.addAdornment(adornment, graphContent.getUpdateCategoriesOptions())
    }

    adornment.setVisibility(true)
    if (settings) applyValues?.(adornment, settings, graphContent)

    const { id, isVisible, type } = adornment
    return { success: true, values: { id, isVisible, type, ...get(adornment, graphContent) } }
  },

  update({ graphContent, values }) {
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingAdornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(adornmentType)
    if (!existingAdornment) return adornmentNotFoundResult
    const settings = valuesObject(values)
    const error = settings && validate?.(settings)
    if (error) return error

    if (settings) {
      if (typeof settings.isVisible === "boolean") existingAdornment.setVisibility(settings.isVisible)
      applyValues?.(existingAdornment, settings, graphContent)
    }

    return { success: true }
  }
})

function valuesObject(values: unknown) {
  return values != null && typeof values === "object" ? values as Record<string, unknown> : undefined
}
