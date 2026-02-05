import { errorResult } from "../../../../data-interactive/handlers/di-results"
import { t } from "../../../../utilities/translation/translate"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"
import { cellKeyToString, stringToCellKey } from "../../utilities/cell-key-utils"

export type AdornmentData = {
  categories?: Record<string, string>
} & Record<string, number | number[] | string | string[] | undefined | null | ((x: number) => void)>

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

/**
 * Converts a cell key that uses an attribute name to one that uses the associated attribute ID instead.
 * Example: given a cell key of { "Diet": "plants" }, it returns { "ATTR123": "plants" }.
 *
 * @param requestCellKey: the cell key string value specified in an API request
 * @param dataset: the dataset associated with the graph
 * @returns a cell key string value with an attribute ID instead of a name, or undefined if the conversion fails
 */
export const normalizeCellKey = (requestCellKey: string, dataConfig: IDataConfigurationModel) => {
  const cellKey = stringToCellKey(requestCellKey)
  const normalizedCellKey: Record<string, string> = {}

  for (const [attrNameOrId, value] of Object.entries(cellKey)) {
    const foundAttr = dataConfig.dataset?.attributes.find(attr => attr.matchTitleOrNameOrId(attrNameOrId))
    if (foundAttr) {
      normalizedCellKey[foundAttr.id] = value
    } else {
      // If any attribute name cannot be resolved to an ID, return undefined.
      return undefined
    }
  }

  return cellKeyToString(normalizedCellKey)
}
