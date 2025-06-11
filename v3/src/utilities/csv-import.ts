import { parse, ParseResult } from "papaparse"
import { kWebViewTileType } from "../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../components/web-view/web-view-model"
import { getImporterPluginUrl } from "../constants"
import { appState } from "../models/app-state"
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

export function initiateImportFromCsv(csvContent: string, dataset: IDataSet) {
  // The importer plugin is used to import a csv string into a dataset.
  const gameState = {
    contentType: 'text/csv',
    targetDatasetName: dataset.name,
    name: "Importer",
    text: csvContent
  }
  const webViewModelSnap: IWebViewSnapshot = {
    type: kWebViewTileType,
    subType: "plugin",
    url: getImporterPluginUrl(),
    state: gameState
  }
  appState.document.content?.insertTileSnapshotInDefaultRow({
    _title: "Importer",
    content: webViewModelSnap
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
