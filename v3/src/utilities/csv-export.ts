import { kDefaultPrecision } from "../constants"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { getMetadataFromDataSet } from "../models/shared/shared-data-utils"

export function escapeCommentValue(value: string) {
  return value.replace(/,/g, "&comma;").replace(/\n/g, "&NewLine;")
}

export function escapeCsvValue(value: string) {
  // Escape double quotes by replacing them with two double quotes
  // and wrap the value in double quotes if it contains commas, double quotes, or newlines
  const escapedValue = value.replace(/"/g, '""')
  return (escapedValue.includes(",") || escapedValue.includes("\n") || escapedValue.includes(`"`))
    ? `"${escapedValue}"` : escapedValue
}

export function convertDatasetToCsv(dataset: IDataSet, collection?: ICollectionModel) {
  const metadata = getMetadataFromDataSet(dataset)

  let csv = `# name: ${escapeCommentValue(dataset.name)}\n`

  const attrs = collection?.attributesArray ?? dataset.attributes
  attrs.forEach(attr => {
    csv += `# attribute -- name: ${escapeCommentValue(attr.name)}`
    if (attr.description) csv += `, description: ${escapeCommentValue(attr.description)}`
    if (attr.type) csv += `, type: ${escapeCommentValue(attr.type)}`
    if (attr.units) csv += `, unit: ${escapeCommentValue(attr.units)}`
    if (attr.precision && attr.precision !== kDefaultPrecision) csv += `, precision: ${attr.precision}`
    csv += `, editable: ${!metadata?.isEditProtected(attr.id)}`
    if (attr.formula?.display) csv += `, formula: ${escapeCommentValue(attr.formula.display)}`
    csv += "\n"
  })

  attrs.forEach((attr, index) => {
    const commaString = index === 0 ? "" : ","
    csv += `${commaString}${escapeCsvValue(attr.name)}`
  })
  csv += "\n"

  const caseOrItemIds = collection?.caseIds ?? dataset.itemIds
  caseOrItemIds.forEach((caseOrItemId, index) => {
    const itemIndex = dataset.getItemIndexForCaseOrItem(caseOrItemId)
    if (itemIndex != null) {
      attrs.forEach((attr, attrIndex) => {
        const commaString = attrIndex === 0 ? "" : ","
        csv += `${commaString}${escapeCsvValue(attr.strValue(itemIndex))}`
      })
      if (index < caseOrItemIds.length - 1) csv += "\n"
    }
  })

  return csv
}
