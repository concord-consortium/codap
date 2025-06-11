import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { getMetadataFromDataSet } from "../models/shared/shared-data-utils"

export function escapeCsvValue(value: string) {
  // Escape double quotes by replacing them with two double quotes
  // and wrap the value in double quotes if it contains commas, double quotes, or newlines
  const escapedValue = value.replace(/"/g, '""')
  return (escapedValue.includes(",") || escapedValue.includes("\n") || escapedValue.includes(`"`))
    ? `"${escapedValue}"` : escapedValue
}

export function convertDatasetToCsv(dataset: IDataSet, collection?: ICollectionModel) {
  const metadata = getMetadataFromDataSet(dataset)

  let csv = `# name: ${dataset.name}\n`

  const attrs = collection?.attributesArray ?? dataset.attributes
  attrs.forEach(attr => {
    csv += `# attribute -- name: ${attr.name.replace(/,/g, "&comma;")}`
    if (attr.description) csv += `, description: ${attr.description}`
    if (attr.type) csv += `, type: ${attr.type}`
    if (attr.units) csv += `, unit: ${attr.units}`
    csv += `, editable: ${!metadata?.isEditProtected(attr.id)}`
    // TODO: Are there other properties we should include?
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
