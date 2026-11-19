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

// An error for the first of `keys` in `values` that is present but not a boolean
export const booleanValuesError = (values: Record<string, unknown>, keys: string[]) => {
  const key = keys.find(_key => values[_key] != null && typeof values[_key] !== "boolean")
  if (key) return errorResult(t("V3.DI.Error.adornmentValueNotBoolean", { vars: [key] }))
}

// An error for the first of `keys` in `values` that is present but not a finite number
export const numberValuesError = (values: Record<string, unknown>, keys: string[]) => {
  const key = keys.find(_key => values[_key] != null && !Number.isFinite(values[_key]))
  if (key) return errorResult(t("V3.DI.Error.adornmentValueNotNumber", { vars: [key] }))
}

// An error for the first of `keys` in `values` that is present but not one of `options`
export const optionValuesError = (values: Record<string, unknown>, keys: string[], options: readonly string[]) => {
  const key = keys.find(_key => values[_key] != null && !options.includes(values[_key] as string))
  if (key) return errorResult(t("V3.DI.Error.adornmentValueNotOneOf", { vars: [key, options.join(", ")] }))
}

// An error for the first of `keys` in `values` that is present but not an object
export const objectValuesError = (values: Record<string, unknown>, keys: string[]) => {
  const isObject = (value: unknown) => typeof value === "object" && !Array.isArray(value)
  const key = keys.find(_key => values[_key] != null && !isObject(values[_key]))
  if (key) return errorResult(t("V3.DI.Error.adornmentValueNotObject", { vars: [key] }))
}

// An error for the first of `keys` in `values` that is present but neither a finite number nor a string
export const numberOrStringValuesError = (values: Record<string, unknown>, keys: string[]) => {
  const key = keys.find(_key => values[_key] != null && typeof values[_key] !== "string" &&
                                !Number.isFinite(values[_key]))
  if (key) return errorResult(t("V3.DI.Error.adornmentValueNotNumberOrString", { vars: [key] }))
}

// A plotted function's or plotted value's formula, sent as `formula` or, if that's absent, `expression`
export const formulaValue = (values: Record<string, unknown>) => {
  const key = values.formula != null ? "formula" : values.expression != null ? "expression" : undefined
  if (!key) return {}
  const formula = values[key]
  return typeof formula === "string"
    ? { formula }
    : { error: errorResult(t("V3.DI.Error.adornmentValueNotString", { vars: [key] })) }
}
