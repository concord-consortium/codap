import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { adornmentNotFoundResult, adornmentNotSupportedByPlotTypeResult,
  invalidValuesProvidedeResult, valuesRequiredResult } from "../../../../data-interactive/handlers/di-results"
import { IGraphContentModel } from "../../models/graph-content-model"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { IAdornmentsBaseStore } from "../store/adornments-base-store"
import { AdornmentData, adornmentMismatchResult, cellKeyToCategories, isAdornmentSupportedByPlotType }
  from "../utilities/adornment-handler-utils"
import { IMovableValueAdornmentModel, isMovableValueAdornment } from "./movable-value-adornment-model"
import { kMovableValueType } from "./movable-value-adornment-types"

export const movableValueAdornmentHandler: DIAdornmentHandler = {
  create(args) {
    const { graphContent } = args
    const isAdornmentSupported = isAdornmentSupportedByPlotType(kMovableValueType, graphContent.plotType)
    if (!isAdornmentSupported) return adornmentNotSupportedByPlotTypeResult

    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []
    const existingMovableValueAdornment =
      adornmentsStore.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    const componentContentInfo = getAdornmentContentInfo(kMovableValueType)
    const adornment =
      existingMovableValueAdornment ?? componentContentInfo.modelClass.create() as IMovableValueAdornmentModel

    if (!existingMovableValueAdornment) {
      const options: IUpdateCategoriesOptions = { ...graphContent.getUpdateCategoriesOptions(), addMovableValue: true }
      adornmentsStore.addAdornment(adornment, options)
    }

    adornment.setVisibility(true)

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const movableValues = adornment.values.get(cellKeyString)
      const movableValuesValues = movableValues ? Object.values(movableValues).map(value => value) : []
      const dataItem: AdornmentData = { movableValues: movableValuesValues }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    const { id, isVisible, type } = adornment
    return { success: true, values: { id, isVisible, type, data } }
  },

  delete(args) {
    const { graphContent } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const adornment = adornmentsStore.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    if (!adornment) return adornmentNotFoundResult

    adornment.deleteValue()
    return { success: true }
  },

  get(adornment: IAdornmentModel, graphContent: IGraphContentModel) {
    if (!isMovableValueAdornment(adornment)) return adornmentMismatchResult(kMovableValueType)

    const dataConfig = graphContent.dataConfiguration
    const cellKeys = dataConfig?.getAllCellKeys()
    const data: AdornmentData[] = []

    for (const cellKey of cellKeys) {
      const cellKeyString = JSON.stringify(cellKey)
      const movableValues = adornment.values.get(cellKeyString)
      const values = movableValues ? Object.values(movableValues) : []
      const dataItem: AdornmentData = { movableValues: values }
    
      if (Object.keys(cellKey).length > 0) {
        dataItem.categories = cellKeyToCategories(cellKey, dataConfig)
      }
    
      data.push(dataItem)
    }

    return { data }
  },

  update(args) {
    const { graphContent, values } = args
    const adornmentsStore = graphContent.adornmentsStore as IAdornmentsBaseStore
    const adornment = adornmentsStore.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    if (!adornment) return adornmentNotFoundResult
  
    const valuePairs = (typeof values === "object" && "values" in values && Array.isArray(values.values))
      ? values.values
      : null
    if (!valuePairs) return valuesRequiredResult
  
    try {
      const updates = new Map<string, number>(valuePairs)
  
      updates.forEach((newValue, cellKey) => {
        if (typeof newValue !== "number") return
  
        if (cellKey === "{}") {
          adornment.replaceValue(newValue, cellKey)
          return
        }
  
        const keyObj = JSON.parse(cellKey)
        const [attrName] = Object.keys(keyObj)
        const attrId = graphContent.dataConfiguration?.dataset?.getAttributeByName(attrName)?.id
        if (!attrId) return

        const internalKey = JSON.stringify({ [attrId]: keyObj[attrName] })
        adornment.replaceValue(newValue, internalKey)
      })
  
      return { success: true }
    } catch {
      return invalidValuesProvidedeResult
    }
  }
}
