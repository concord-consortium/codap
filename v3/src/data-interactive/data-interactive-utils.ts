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
    const trimmed = name.trim()
    const key = !dataSet.attrIDFromName(name) && dataSet.attrIDFromName(trimmed) ? trimmed : name
    delete result[key]
    result[key] = value
  })
  return result as T
}

// As in V2, values given as an array are set in the order of the collection's attributes, extra values are
// ignored, and a null or undefined value clears its attribute. Unlike V2, which wrote to them anyway, formula
// attributes are skipped, since they compute their own values.
export function arrayValuesToIds(values: unknown[], collection: ICollectionModel) {
  const caseValues: ICaseCreation = {}
  collection.attributes.forEach((attr, index) => {
    if (attr && !attr.hasFormula && index < values.length) {
      caseValues[attr.id] = values[index] ?? ""
    }
  })
  return caseValues
}

export function attrNamesToIds(values: DICaseValues, dataSet: IDataSet, v2Ids?: boolean) {
  const caseValues: ICaseCreation = {}
  Object.keys(values).forEach(attrName => {
    const attrId = attrIDFromValuesName(dataSet, attrName)
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
