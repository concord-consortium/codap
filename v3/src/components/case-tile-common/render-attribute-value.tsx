import { format } from "d3-format"
import React from "react"
import { IAttribute } from "../../models/data/attribute"
import { kDefaultFormatStr } from "../../models/data/attribute-types"
import { parseColor } from "../../utilities/color-utils"
import { isStdISODateString } from "../../utilities/date-iso-utils"
import { parseDate } from "../../utilities/date-parser"
import { DatePrecision, formatDate } from "../../utilities/date-utils"

// cache d3 number formatters so we don't have to generate them on every render
type TNumberFormatter = (n: number) => string
const formatters = new Map<string, TNumberFormatter>()

export const getNumFormatter = (formatStr: string) => {
  let formatter = formatters.get(formatStr)
  if (formatStr && !formatter) {
    formatter = format(formatStr)
    formatters.set(formatStr, formatter)
  }
  return formatter
}

export function renderAttributeValue(str = "", num = NaN, attr?: IAttribute, key?: number) {
  const { type, userType } = attr || {}

  // colors
  const color = type === "color" || !userType ? parseColor(str, { colorNames: type === "color" }) : ""
  if (color) {
    return {
      value: color,
      content: (
        <div className="cell-color-swatch" key={key}>
          <div className="cell-color-swatch-interior" style={{ background: color }} />
        </div>
      )
    }
  }

  // numbers
  if (isFinite(num)) {
    const formatStr = attr?.format ?? kDefaultFormatStr
    const formatter = getNumFormatter(formatStr)
    if (formatter) str = formatter(num)
  }

  // Dates
  // Note that CODAP v2 formats dates in the case table ONLY if the user explicitly specifies the type as "date".
  // Dates are not interpreted as dates and formatted by default. However, V3 adds one exception to this rule:
  // if the date string is strictly an ISO string produced by the browser's Date.toISOString(), it will be treated as
  // a Date object that should be formatted. The main reason for this is to format the results of date formulas.
  // This is because CODAP v3 stores all the case values as strings natively, and we cannot simply check if the value
  // is an instance of the `Date` class (as it will never be). Date.toISOString() is the native way of serializing dates
  // in CODAP v3 (check `importValueToString` from attribute.ts).
  if (isStdISODateString(str) || userType === "date" && str !== "") {
    const date = parseDate(str, true)
    if (date) {
      // TODO: add precision support for date formatting
      const formattedDate = formatDate(date, DatePrecision.None)
      return {
        value: str,
        content: <span className="cell-span" key={key}>{formattedDate || `"${str}"`}</span>
      }
    } else {
      // If the date is not valid, wrap it in quotes (CODAP V2 behavior).
      str = `"${str}"`
    }
  }

  return {
    value: str,
    content: <span className="cell-span" key={key}>{str}</span>
  }
}
