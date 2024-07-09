import { appState } from "../models/app-state"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { getTilePrefixes } from "../models/tiles/tile-content-info"
import { toV3Id, toV3TileId } from "../utilities/codap-utils"
import { DIParsedQuery, DIQueryFunction } from "./data-interactive-types"

export function parseSearchQuery(query: string, dataContextOrCollection?: IDataSet | ICollectionModel): DIParsedQuery {
  if (query === "*") {
    return { valid: true, func: () => true }
  }

  // RegExs here and below taken from CODAP v2
  const matches = query.match(/([^=!<>]+)(==|!=|<=|<|>=|>)([^=!<>]*)/)
  if (!matches) return { valid: false, func: () => false }
  
  const parseOperand = (_rawValue: string) => {
    // Trim whitespace
    const rawValue = _rawValue.replace(/^\s+|\s+$/g, '')

    const numberValue = Number(rawValue)
    const value = rawValue === "" ? ""
      : rawValue === "true" ? true
      : rawValue === "false" ? false
      : isNaN(numberValue) ? rawValue
      : numberValue
    return {
      value,
      attr: dataContextOrCollection?.getAttributeByName(rawValue),
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

export function findTileFromV2Id(v2Id: string) {
  const { document } = appState
  // We look for every possible v3 id the component might have (because each tile type has a different prefix).
  // Is there a better way to do this?
  const possibleIds =
    [v2Id, toV3TileId(v2Id), ...getTilePrefixes().map(prefix => toV3Id(prefix, v2Id))]
  const componentId = possibleIds.find(id => document.content?.getTile(id))
  if (componentId) return document.content?.getTile(componentId)
}
