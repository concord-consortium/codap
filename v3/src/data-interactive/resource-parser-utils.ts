import { IDataSet } from "../models/data/data-set"
import { DIParsedQuery, DIQueryFunction } from "./data-interactive-types"

export function parseSearchQuery(query: string, dataContext?: IDataSet): DIParsedQuery {
  if (query === "*") {
    return { valid: true, func: () => true }
  }

  // RegExs here and below taken from CODAP v2
  const matches = query.match(/([^=!<>]+)(==|!=|<=|<|>=|>)([^=!<>]+)/)
  if (!matches) return { valid: false, func: () => false }
  
  const parseOperand = (_rawValue: string) => {
    // Trim whitespace
    const rawValue = _rawValue.replace(/^\s+|\s+$/g, '')

    const numberValue = Number(rawValue)
    const value = rawValue === "true" ? true
      : rawValue === "false" ? false
      : isNaN(numberValue) ? rawValue
      : numberValue
    return {
      value,
      attr: dataContext?.getAttributeByName(rawValue),
      name: rawValue
    }
  }

  const left = parseOperand(matches[1])
  const right = parseOperand(matches[3])
  const valid = !!left.attr || !!right.attr
  const op = matches[2]
  const func: DIQueryFunction = op === "==" ? (a, b) => a == b // eslint-disable-line eqeqeq
    : op === "!=" ? (a, b) => a != b // eslint-disable-line eqeqeq
    : op === "<" ? (a, b) => a != null && b != null && a < b
    : op === "<=" ? (a, b) => a != null && b != null && a <= b
    : op === ">=" ? (a, b) => a != null && b != null && a >= b
    : op === ">" ? (a, b) => a != null && b != null && a > b
    : () => false
  
  return { valid, left, right, func }
}
