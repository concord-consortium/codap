import { parse, ParseResult } from "papaparse"
import { ICollectionModel } from "../models/data/collection"
import { DataSet, IDataSet } from "../models/data/data-set"
import { getMetadataFromDataSet } from "../models/shared/shared-data-utils"

type RowType = Record<string, string>
export type CsvParseResult = ParseResult<RowType>

export function importCsvContent(content: string, onComplete: (results: CsvParseResult) => void) {
  parse(content, { comments: "#", header: true, complete: onComplete })
}

export function importCsvFile(file: File | null, onComplete: (results: CsvParseResult, aFile: any) => void) {
  parse(file, { comments: "#", header: true, complete: onComplete })
}

export function downloadCsvFile(dataUrl: string,
  onComplete: (results: CsvParseResult, aFile: any) => void,
  onError: (error: Error, file: string) => void
) {
  parse(dataUrl, { download: true, comments: "#", header: true, complete: onComplete, error: onError })
}

export function convertParsedCsvToDataSet(results: CsvParseResult, filename: string) {
  // Remove extension
  // From https://stackoverflow.com/questions/4250364/how-to-trim-a-file-extension-from-a-string-in-javascript
  const name = filename.replace(/\.[^/.]+$/, "")
  const ds = DataSet.create({ name })
  // add attributes (extracted from first case)
  for (const pName in results.data[0]) {
    ds.addAttribute({ name: pName.trim() })
  }
  // add cases
  ds.addCases(results.data, { canonicalize: true })

  return ds
}

export function addParsedCsvToDataSet(results: CsvParseResult, dataset: IDataSet, append?: boolean) {
  // FIXME: Handle append
  // TODO: Properly handle undo/redo
  dataset.applyModelChange(() => {
    if (!append) {
      dataset.removeCases(dataset.itemIds)
      dataset.attributes.forEach(attr => dataset.removeAttribute(attr.id))
    }

    // add attributes (extracted from first case)
    for (const pName in results.data[0]) {
      const attrName = pName.trim()
      if (!dataset.getAttributeByName(attrName)) dataset.addAttribute({ name: attrName })
    }
    // add cases
    dataset.addCases(results.data, { canonicalize: true })
  })
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
