import { isDateString, parseDate } from "./date-parser"
import { isDate } from "./date-utils"

export const valueToString = function (iValue: any): string {
  let valType: string = typeof iValue,
    value = iValue
  if (isDate(iValue)) {
    // treat dates as strings
    // todo: value = formatDate(iValue)
    value = String(iValue)
    valType = "string"
  } else if (iValue instanceof Error) {
    value = `${iValue.name} ${iValue.message}`
    valType = "string"
  } /* todo: handle map
  else if (iValue instanceof SimpleMap) {
    // map has its own toString() function
    valType = "map"
  }*/
  switch (valType) {
    case "string":
      return value
    case "number":
    case "boolean":
    case "map":
      return String(iValue)
  }
  return ""
}

interface ICompareProps {
  a: number
  b: number
  order: "asc" | "desc"
}

export const numericSortComparator = function ({a, b, order}: ICompareProps): number {
  const aIsNaN = isNaN(a)
  const bIsNaN = isNaN(b)

  if (aIsNaN && bIsNaN) return 0
  if (bIsNaN) return order === "asc" ? 1 : -1
  if (aIsNaN) return order === "asc" ? -1 : 1
  return order === "asc" ? a - b : b - a
}

export const
  kTypeError = 1,
  kTypeNaN = 2,
  kTypeNull = 3,
  kTypeString = 4,
  kTypeBoolean = 5,
  kTypeNumber = 6,
  kTypeDate = 7,
  // kTypeSimpleMap = 8, // e.g. boundaries
  kTypeUnknown = 9

export function typeCode(value: any) {
  if (value == null) return kTypeNull
  if (value instanceof Error) return kTypeError
  if (isDate(value) || isDateString(value)) return kTypeDate
  // if (value instanceof DG.SimpleMap) return kTypeSimpleMap;
  switch (typeof value) {
    case 'number': return isNaN(value) ? kTypeNaN : kTypeNumber
    case 'boolean': return kTypeBoolean
    case 'string': return kTypeString
    /* istanbul ignore next */
    default: return kTypeUnknown
  }
}

export function sortableValue(value: any) {
  const type = typeCode(value)
  let num = type === kTypeNumber ? value : NaN
  // strings convertible to numbers are treated numerically
  if (type === kTypeString && value.length) {
    num = Number(value)
    if (!isNaN(num)) return { type: kTypeNumber, value: num }
  }
  // booleans are treated as strings
  else if (type === kTypeBoolean) {
    return { type: kTypeString, value }
  }
  // dates are treated numerically
  else if (type === kTypeDate) {
    const date = isDate(value) ? value : parseDate(value)
    if (!date) return { type: kTypeNull, value: null }
    return { type: kTypeNumber, value: date.getTime() / 1000 }
  }
  // other values are treated according to their type
  return { type, value }
}

// Ascending comparator; negate the result for descending
export function compareValues(value1: any, value2: any, strCompare: (a: string, b: string) => number) {
  const v1 = sortableValue(value1)
  const v2 = sortableValue(value2)

  // if types differ, then sort by type
  if (v1.type !== v2.type) return v1.type - v2.type

  // if types are the same, then sort by value
  switch (v1.type) {
    case kTypeNumber: return v1.value - v2.value
    case kTypeString:
    case kTypeError: return strCompare(String(v1.value), String(v2.value))
    default: return 0 // other types are not ordered within type
  }
}
