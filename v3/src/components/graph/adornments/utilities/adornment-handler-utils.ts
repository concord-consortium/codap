import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"
import { kCountType, kPercentType } from "../count/count-adornment-types"
import { kMeanType } from "../univariate-measures/mean/mean-adornment-types"
import { kMedianType } from "../univariate-measures/median/median-adornment-types"

export type AdornmentType = typeof kCountType | typeof kMeanType | typeof kMedianType | typeof kPercentType

export type AdornmentData<T extends AdornmentType> = {
  categories?: Record<string, string>
} & Record<T, number | number[] | string | undefined | null | ((x: number) => void)>

export const cellKeyToCategories = (cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) => {
  const categories: Record<string, string> = {}
  for (const [attributeId, categoryValue] of Object.entries(cellKey)) {
    const attributeName = dataConfig.dataset?.getAttribute(attributeId)?.name || ""
    categories[attributeName] = categoryValue
  }

  return categories
}
