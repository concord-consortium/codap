import { clsx } from "clsx"
import { format } from "d3-format"
import React from "react"
import { measureText } from "../../hooks/use-measure-text"
import { boundaryObjectFromBoundaryValue } from "../../models/boundaries/boundary-types"
import { IAttribute } from "../../models/data/attribute"
import { kDefaultNumPrecision } from "../../models/data/attribute-types"
import { parseColor } from "../../utilities/color-utils"
import { isStdISODateString } from "../../utilities/date-iso-utils"
import { parseDate } from "../../utilities/date-parser"
import { formatDate } from "../../utilities/date-utils"
import {
  kCaseTableBodyFont, kCaseTableHeaderFont, kDefaultRowHeight,
  kMaxAutoColumnWidth, kMinAutoColumnWidth, kSnapToLineHeight
} from "../case-table/case-table-types"
import {CheckboxCell, isBoolean} from "./checkbox-cell"

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

export interface IRenderAttributeValueOptions {
  caseId?: string
  key?: number
  rowHeight?: number
  showUnits?: boolean
}

export function renderAttributeValue(str = "", num = NaN, attr?: IAttribute, options?: IRenderAttributeValueOptions) {
  const { type, userType, numPrecision, datePrecision, id: attrId } = attr || {}
  const { caseId, key, rowHeight = kDefaultRowHeight, showUnits } = options || {}
  let formatClass = ""
  // https://css-tricks.com/almanac/properties/l/line-clamp/
  const lineClamp = rowHeight > kDefaultRowHeight
                      ? Math.ceil(rowHeight / (kSnapToLineHeight + 1))
                      : 0

  // boundaries
  if (type === "boundary") {
    const boundaryObject = boundaryObjectFromBoundaryValue(str)
    const thumb = boundaryObject?.properties?.THUMB
    if (thumb) {
      return {
        value: boundaryObject?.properties?.NAME ?? str,
        content: (
          <span className="cell-boundary-thumb">
            <img src={thumb} alt="thumb" className="cell-boundary-thumb-interior" />
          </span>
        )
      }
    }
  }

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

  // checkboxes
  if (userType === "checkbox" && isBoolean(str)) {
    return {
      value: str,
      content: <CheckboxCell caseId={caseId ?? ""} attrId={attrId ?? ""} />
    }
  }

  // numbers
  if (isFinite(num)) {
    const formatStr = `.${numPrecision ?? kDefaultNumPrecision}~f`
    const formatter = getNumFormatter(formatStr)
    if (formatter) {
      str = `${formatter(num)}${showUnits ? ` ${attr?.units}` : ""}`
      formatClass = "numeric-format"
    }
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
      const formattedDate = formatDate(date, datePrecision)
      return {
        value: formattedDate || str,
        content:  <span className="cell-span" key={key} style={{ WebkitLineClamp: lineClamp }}>
                    {formattedDate || `"${str}"`}
                  </span>
      }
    } else {
      // If the date is not valid, wrap it in quotes (CODAP V2 behavior).
      str = `"${str}"`
    }
  }

  return {
    value: str,
    content:  <span className={clsx("cell-span", formatClass)} key={key} style={{ WebkitLineClamp: lineClamp }}>
                {str}
              </span>
  }
}

export const findLongestContentWidth = (attr: IAttribute) => {
  // We take in to account that attribute names can appear over two lines and elided
  // when calculating their widths
  const headerWidth = measureText(`${attr.name}${attr.units ? `_(${attr.units})` : ''}`, kCaseTableHeaderFont)
  let longestWidth = Math.max(kMinAutoColumnWidth, Math.ceil(3 + (headerWidth/2)))
  for (let i = 0; i < attr.length; ++i) {
    // use the formatted attribute value in content width calculation
    const { value } = renderAttributeValue(attr.strValues[i], attr.numValues[i], attr)
    longestWidth = Math.max(longestWidth, measureText(value, kCaseTableBodyFont))
  }
  return Math.min(longestWidth, kMaxAutoColumnWidth)
}
