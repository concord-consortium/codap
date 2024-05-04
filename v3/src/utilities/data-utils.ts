import { isDate } from "mathjs"

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
