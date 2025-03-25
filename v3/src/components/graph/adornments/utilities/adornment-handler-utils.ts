import { errorResult } from "../../../../data-interactive/handlers/di-results"
import { t } from "../../../../utilities/translation/translate"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"

export type AdornmentData = {
  categories?: Record<string, string>;
} & Record<string, number | number[] | string | undefined | null | ((x: number) => void)>

export const cellKeyToCategories = (cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) => {
  const categories: Record<string, string> = {}
  for (const [attributeId, categoryValue] of Object.entries(cellKey)) {
    const attributeName = dataConfig.dataset?.getAttribute(attributeId)?.name || ""
    categories[attributeName] = categoryValue
  }

  return categories
}

export const adornmentMismatchResult = (adornmentType: string) => {
  return errorResult(t("V3.DI.Error.adornmentMismatch", { vars: [adornmentType] }))
}
