import { parse, ParseResult } from "papaparse"
import { kWebViewTileType } from "../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../components/web-view/web-view-model"
import { getImporterPluginUrl } from "../constants"
import { appState } from "../models/app-state"
import { DataSet, IDataSet } from "../models/data/data-set"

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

interface IImportFromCsvContentArgs {
  text: string
  data: IDataSet
}
interface IImportFromCsvFileArgs {
  file: File
}
type IImportFromCsvArgs = IImportFromCsvContentArgs | IImportFromCsvFileArgs

export function initiateImportFromCsv(options: IImportFromCsvArgs) {
  // The importer plugin is used to import a csv string into a dataset.
  const webViewModelSnap: IWebViewSnapshot = {
    type: kWebViewTileType,
    subType: "plugin",
    url: getImporterPluginUrl(),
    state: {
      contentType: 'text/csv',
      name: "Importer",
      file: "file" in options ? options.file : undefined,
      targetDatasetName: "data" in options ? options.data.name : undefined,
      text: "text" in options ? options.text : undefined
    }
  }
  appState.document.content?.insertTileSnapshotInDefaultRow({
    _title: "Importer",
    content: webViewModelSnap
  })
}
