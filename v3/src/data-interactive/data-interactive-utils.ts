import { kTitleBarHeight } from "../components/constants"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { ICaseCreation } from "../models/data/data-set-types"
import { toV2Id, toV3AttrId, toV3CollectionId } from "../utilities/codap-utils"
import { DICaseValues } from "./data-interactive-data-set-types"

export function canonicalizeAttributeName(name: string, iCanonicalize = true) {
  let tName = name ?? ""
  const tReg = /\([^)]*\)$/ // Identifies parenthesized substring at end

  tName = tName.trim() // Get rid of trailing white space
  if (iCanonicalize) {
    tName = tName.replace(tReg, '')  // Get rid of parenthesized units
    tName = tName.replace(/\W/g, '_')  // Replace non-word characters with underscore
  }
  // if after all this we have an empty string replace with a default name.
  if (tName.length === 0) {
    tName = 'attr'
  }
  return tName
}

interface IDimensions { width?: number, height?: number }

// The sides of a size a plugin sent that are usable: positive numbers, or text that converts to one
export function validDimensions(dimensions?: unknown): IDimensions {
  if (!dimensions || typeof dimensions !== "object") return {}
  const pick = (value: unknown) => {
    const num = typeof value === "number" || typeof value === "string" ? Number(value) : NaN
    return isFinite(num) && num > 0 ? num : undefined
  }
  const { width, height } = dimensions as Record<string, unknown>
  const [w, h] = [pick(width), pick(height)]
  return { ...(w != null && { width: w }), ...(h != null && { height: h }) }
}

// A tile's size for a given size of its content: CODAP's only chrome is the title bar
export function tileDimensionsFromContent({ width, height }: IDimensions): IDimensions {
  return { ...(width != null && { width }), ...(height != null && { height: height + kTitleBarHeight }) }
}

export function contentDimensionsFromTile({ width, height }: IDimensions): IDimensions {
  return { ...(width != null && { width }), ...(height != null && { height: Math.max(height - kTitleBarHeight, 0) }) }
}

export function getCaseValues(caseId: string, dataSet: IDataSet, collectionId?: string) {
  const attributes = collectionId
                      ? dataSet.getCollection(collectionId)?.attributes ?? []
                      : dataSet.attributes

  const values: DICaseValues = {}
  const itemIndex = dataSet.getItemIndex(caseId) ?? -1
  attributes.map(attribute => {
    if (attribute?.name) {
      values[attribute.name] = dataSet.getValue(caseId, attribute.id) ?? attribute?.value(itemIndex)
    }
  })

  return values
}

// Converts an attributeName => value dictionary to attributeId => value
export function attrNamesToIds(values: DICaseValues, dataSet: IDataSet, v2Ids?: boolean) {
  const caseValues: ICaseCreation = {}
  Object.keys(values).forEach(attrName => {
    const attrId = dataSet.attrIDFromName(attrName)
    if (attrId) {
      const _attrId = v2Ids ? toV2Id(attrId) : attrId
      caseValues[_attrId] = values[attrName]
    }
  })
  return caseValues
}

export function getCollection(dataContext?: IDataSet, nameOrId?: string) {
  if (!dataContext || !nameOrId) return

  return dataContext?.getCollectionByName(nameOrId) ||
    dataContext?.getCollection(toV3CollectionId(nameOrId))
}

export function getAttribute(nameOrId: string, dataContext?: IDataSet, collection?: ICollectionModel) {
  const canonicalAttrName = canonicalizeAttributeName(nameOrId)
  // check collection first in case of ambiguous names in data set
  return collection?.getAttributeByName(nameOrId) || collection?.getAttributeByName(canonicalAttrName) ||
    dataContext?.getAttributeByName(nameOrId) || dataContext?.getAttributeByName(canonicalAttrName) ||
    dataContext?.getAttribute(toV3AttrId(nameOrId)) // in case it's an id
}
