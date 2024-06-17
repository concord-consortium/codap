import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { ICaseCreation } from "../models/data/data-set-types"
import { toV2Id, toV3AttrId, toV3CollectionId } from "../utilities/codap-utils"
import { DICaseValues } from "./data-interactive-types"

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
  const actualCaseIndex = dataSet.itemIDMap.get(caseId) ?? -1
  attributes.map(attribute => {
    if (attribute?.name) {
      values[attribute.name] = dataSet.caseGroupMap.get(caseId)?.groupedCase[attribute.id] ??
        attribute?.value(actualCaseIndex)
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
