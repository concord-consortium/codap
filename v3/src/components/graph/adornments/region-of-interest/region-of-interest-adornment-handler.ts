import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IGraphContentModel } from "../../models/graph-content-model"
import { IAdornmentModel } from "../adornment-models"
import { IRegionOfInterestAdornmentModel, isRegionOfInterestAdornment } from "./region-of-interest-adornment-model"
import { adornmentMismatchResult } from "../utilities/adornment-handler-utils"
import { kRegionOfInterestType } from "./region-of-interest-adornment-types"
import { adornmentNotFoundResult } from "../../../../data-interactive/handlers/di-results"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { IAdornmentsBaseStore } from "../store/adornments-base-store"
import { DIAdornmentValues, DIRegionOfInterestAdornmentValues, isAdornmentValues }
  from "../../../../data-interactive/data-interactive-adornment-types"

const setAdornmentProperties = (adornment: IRegionOfInterestAdornmentModel, values: DIAdornmentValues) => {
  if (isAdornmentValues(values)) {
    const { height, isVisible, xPosition, yPosition, width } = values as DIRegionOfInterestAdornmentValues
    if (isVisible != null) {
      adornment.setVisibility(isVisible)
    }
    if (height != null) {
      adornment.setHeight(height)
    }
    if (width != null) {
      adornment.setWidth(width)
    }
    if (xPosition != null) {
      adornment.setXPosition(xPosition)
    }
    if (yPosition != null) {
      adornment.setYPosition(yPosition)
    }

    // adornment.setPosition(x ?? adornment.xPosition, y ?? adornment.yPosition)
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

    const { id, isVisible, height, type, width, xPosition, yPosition } = adornment
    return {
      success: true,
      values: {
        id,
        isVisible,
        height: JSON.stringify(height),
        type,
        width: JSON.stringify(width),
        xPosition: JSON.stringify(xPosition),
        yPosition: JSON.stringify(yPosition)
      }
    }
  },
  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isRegionOfInterestAdornment(adornment)) return adornmentMismatchResult(kRegionOfInterestType)

    const { id, isVisible, height, type, width, xPosition, yPosition } = adornment
    return {
      id, isVisible, height: JSON.stringify(height),
      type, width: JSON.stringify(width), xPosition: JSON.stringify(xPosition), yPosition: JSON.stringify(yPosition)
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
