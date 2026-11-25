import { kTitleBarHeight } from "../components/constants"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { ICaseCreation } from "../models/data/data-set-types"
import { toV3AttrId, toV3CollectionId } from "../utilities/codap-utils"
import { DICaseValue, DICaseValues, DIRequestCaseValues } from "./data-interactive-data-set-types"

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

// A stored value as a plugin reads it. V2 returned each value as sent (case_model.js:186-190), but V3 keeps every
// value as text, so text reads back unchanged unless it's how JavaScript writes a number (including "Infinity"),
// as every number a plugin sends is stored, or it's "true" or "false", as V2 kept booleans (data_utilities.js:63-71).
export function toPluginValue(value?: string) {
  if (value === "true") return true
  if (value === "false") return false
  const num = Number(value)
  return !isNaN(num) && String(num) === value ? num : value
}

export function getCaseValues(caseId: string, dataSet: IDataSet, collectionId?: string) {
  const attributes = collectionId
                      ? dataSet.getCollection(collectionId)?.attributes ?? []
                      : dataSet.attributes

  const values: DICaseValues = {}
  const itemIndex = dataSet.getItemIndexForCaseOrItem(caseId)
  attributes.forEach(attribute => {
    if (attribute?.name) {
      values[attribute.name] = itemIndex != null
                                ? toPluginValue(dataSet.getStrValueAtFullItemIndex(itemIndex, attribute.id))
                                : undefined
    }
  })

  return values
}

// As in V2, a name in a plugin's values that matches no attribute is tried again with leading and trailing
// spaces removed
export function attrIDFromValuesName(dataSet: IDataSet, name: string) {
  return dataSet.attrIDFromName(name) ?? dataSet.attrIDFromName(name.trim())
}

// The values with each name that matches no attribute replaced by its trimmed form, if that matches one. As in
// V2, when two names reach the same attribute, the later one wins.
export function withAttrNamesTrimmed<T extends Record<string, unknown>>(values: T, dataSet: IDataSet): T {
  const result: Record<string, unknown> = {}
  Object.entries(values).forEach(([name, value]) => {
    const key = attrIDFromValuesName(dataSet, name) === dataSet.attrIDFromName(name) ? name : name.trim()
    result[key] = value
  })
  return result as T
}

// As in V2, values given as an array are set in the order of the collection's attributes, extra values are
// ignored, and a null or undefined value clears its attribute. Unlike V2, which wrote to them anyway, formula
// attributes are skipped, since they compute their own values.
function arrayValuesToIds(values: DICaseValue[], collection: ICollectionModel) {
  const caseValues: ICaseCreation = {}
  collection.attributes.forEach((attr, index) => {
    if (attr && !attr.hasFormula && index < values.length) {
      caseValues[attr.id] = values[index]
    }
  })
  return caseValues
}

// Converts a plugin's attributeName => value dictionary to attributeId => value, and lists the names that match no
// attribute (as in V2, an update that names one replies with failure, though the other values are set). Values
// given as an array are read in the order of the collection's attributes; pass the collection only where an array
// is accepted.
export function resolveAttrNames(values: DIRequestCaseValues, dataSet: IDataSet, collection?: ICollectionModel) {
  if (Array.isArray(values) && collection) {
    return { caseValues: arrayValuesToIds(values, collection), unknownNames: [] }
  }
  const caseValues: ICaseCreation = {}
  const unknownNames: string[] = []
  Object.entries(values).forEach(([attrName, value]) => {
    const attrId = attrIDFromValuesName(dataSet, attrName)
    if (attrId) {
      caseValues[attrId] = value
    } else {
      unknownNames.push(attrName)
    }
  })
  return { caseValues, unknownNames }
}

// Converts a plugin's attributeName => value dictionary (or array; see resolveAttrNames) to attributeId => value
export function attrNamesToIds(values: DIRequestCaseValues, dataSet: IDataSet, collection?: ICollectionModel) {
  return resolveAttrNames(values, dataSet, collection).caseValues
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
