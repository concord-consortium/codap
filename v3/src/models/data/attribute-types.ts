import { formatStdISODateString } from "../../utilities/date-iso-utils"

export const kDefaultNumPrecision = 2
export const kDefaultNumFormatStr = `.${kDefaultNumPrecision}~f`

export type IValueType = string | number | boolean | Date | object | undefined

export function importValueToString(value: IValueType): string {
  if (value == null) {
    return ""
  }
  if (typeof value === "string") {
    return value.trim()
  }
  if (value instanceof Date) {
    return formatStdISODateString(value)
  }
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  return value.toString()
}

export const attributeTypes = [
  "categorical", "numeric", "date", "qualitative", "boundary", "checkbox", "color"
] as const
export type AttributeType = typeof attributeTypes[number]
export function isAttributeType(type?: string | null): type is AttributeType {
  return type != null && (attributeTypes as readonly string[]).includes(type)
}
export function isCategoricalAttributeType(type?: AttributeType): boolean {
  // treat color and checkbox as categorical for now
  return type != null && ["categorical", "checkbox", "color"].includes(type)
}
export function isNumericAttributeType(type?: AttributeType): boolean {
  return ["numeric", "date", "qualitative"].includes(type || "")
}
