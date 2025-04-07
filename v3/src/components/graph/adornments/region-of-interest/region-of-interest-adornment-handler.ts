import { DIAdornmentValues, DIRegionOfInterestAdornmentValues, isAdornmentValues }
  from "../../../../data-interactive/data-interactive-adornment-types"
import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult } from "../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../models/graph-content-model"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { IAdornmentModel } from "../adornment-models"
import { IAdornmentsBaseStore } from "../store/adornments-base-store"
import { adornmentMismatchResult } from "../utilities/adornment-handler-utils"
import { IRegionOfInterestAdornmentModel, isRegionOfInterestAdornment } from "./region-of-interest-adornment-model"
import { kRegionOfInterestType } from "./region-of-interest-adornment-types"


const setAdornmentProperties = (adornment: IRegionOfInterestAdornmentModel, values: DIAdornmentValues) => {
  if (isAdornmentValues(values)) {
    const { isVisible, primary, secondary } = values as DIRegionOfInterestAdornmentValues
    if (isVisible != null) {
      adornment.setVisibility(isVisible)
    }
    if (primary != null) {
      const { position, extent } = primary
      adornment.setPrimary({ position, extent })
    }
    if (secondary != null) {
      const { position, extent, axis } = secondary
      adornment.setSecondary({ position, extent, axis })
    }
  }
}

export const regionOfInterestAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent, values } = args

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const existingAdornment =
      adornmentsStore.findAdornmentOfType<IRegionOfInterestAdornmentModel>(kRegionOfInterestType)
    const componentContentInfo = getAdornmentContentInfo(kRegionOfInterestType)
    const adornment = existingAdornment ??
      componentContentInfo.modelClass.create() as IRegionOfInterestAdornmentModel

    if (isAdornmentValues(values)) {
      const createValues = { ...values, isVisible: true }
      setAdornmentProperties(adornment, createValues)
    }

    if (!existingAdornment) {
      adornmentsStore.addAdornment(adornment, { dataConfig })
    }

    const { id, isVisible, type, primary, secondary } = adornment
    return {
      success: true,
      values: {
        id,
        isVisible,
        type,
        primary: JSON.stringify(primary),
        secondary: JSON.stringify(secondary)
      }
    }
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isRegionOfInterestAdornment(adornment)) return adornmentMismatchResult(kRegionOfInterestType)

    const { id, isVisible, type, primary, secondary } = adornment
    return {
      id,
      isVisible,
      type,
      primary: JSON.stringify(primary),
      secondary: JSON.stringify(secondary)
    }
  },

  update(args) {
    const { graphContent, values } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const existingAdornment =
      adornmentsStore.findAdornmentOfType<IRegionOfInterestAdornmentModel>(kRegionOfInterestType)
    if (!existingAdornment) return adornmentNotFoundResult

    if (isAdornmentValues(values)) {
      setAdornmentProperties(existingAdornment, values)
    }

    return { success: true }
  }
}
