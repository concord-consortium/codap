import { IDataSet } from "../models/data/data-set"
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

export function getCaseValues(caseId: string, collectionId: string, dataSet: IDataSet) {
  const attributes = dataSet.getGroupedCollection(collectionId)?.attributes ??
    dataSet.ungroupedAttributes

  const values: DICaseValues = {}
  const actualCaseIndex = dataSet.caseIDMap.get(caseId) ?? -1
  attributes.map(attribute => {
    if (attribute?.name) {
      values[attribute.name] = dataSet.pseudoCaseMap.get(caseId)?.pseudoCase[attribute.id] ??
        attribute?.value(actualCaseIndex)
    }
  })

  return values
}
