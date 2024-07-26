import { appState } from "../models/app-state"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { FormulaMathJsScope } from "../models/formula/formula-mathjs-scope"
import { math } from "../models/formula/functions/math"
import { displayToCanonical } from "../models/formula/utils/canonicalization-utils"
import { getDisplayNameMap } from "../models/formula/utils/name-mapping-utils"
import { getSharedDataSets } from "../models/shared/shared-data-utils"
import { getTilePrefixes } from "../models/tiles/tile-content-info"
import { getGlobalValueManager, getSharedModelManager } from "../models/tiles/tile-environment"
import { toV3Id, toV3TileId } from "../utilities/codap-utils"
import { t } from "../utilities/translation/translate"
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

export function evaluateCaseFormula(displayFormula: string, dataset: IDataSet, collection: ICollectionModel) {
  // Build displayNameMap
  const { document } = appState
  const localDataSet = dataset
  const dataSets: Map<string, IDataSet> = new Map()
  getSharedDataSets(document).forEach(sharedDataSet => {
    const { dataSet } = sharedDataSet
    dataSets.set(dataSet.id, dataSet)
  })
  const globalValueManager = getGlobalValueManager(getSharedModelManager(document))
  const displayNameMap = getDisplayNameMap({
    localDataSet,
    dataSets,
    globalValueManager,
  })

  // Canonicalize formula
  let formula = ""
  try {
    formula = displayToCanonical(displayFormula, displayNameMap)
  } catch (e: any) {
    return { valid: false, error: t("V3.DI.Error.couldNotParseQuery") }
  }

  // Evaluate formula for each case in collection
  const caseIds: string[] = []
  const childMostCollectionCaseIds = dataset.childCollection.caseIds
  const errors = collection.caseIds.map(caseId => {
    const scope = new FormulaMathJsScope({
      localDataSet,
      dataSets,
      globalValueManager,
      caseIds: [caseId],
      childMostCollectionCaseIds
    })

    try {
      if (math.evaluate(formula, scope)) caseIds.push(caseId)
    } catch (e: any) {
      return e.message
    }
  })

  // Fail if any errors were encountered
  const error = errors.find(e => !!e)
  if (error) {
    return { valid: false, error }
  }

  // Return case ids for cases that satisfied the formula
  return { valid: true, caseIds }
}

export function findTileFromName(name: string) {
  const { content } = appState.document
  if (content) {
    return Array.from(content.tileMap.values()).find(tile => tile.name === name)
  }
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
