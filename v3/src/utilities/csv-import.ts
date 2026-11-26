import { parse, ParseConfig, ParseResult } from "papaparse"
import { DataSet, IDataSet } from "../models/data/data-set"
import { insertImporterTile } from "./generic-import"

type RowType = Record<string, string>
export type CsvParseResult = ParseResult<RowType>

const csvParseOptions: ParseConfig<RowType> = {
  comments: "#",
  header: true,
  skipEmptyLines: "greedy",
  transformHeader: (h: string) => h.trim()
}

export function importCsvContent(content: string, onComplete: (results: CsvParseResult) => void) {
  parse(content, { ...csvParseOptions, complete: onComplete })
}

export function importCsvFile(file: File | null, onComplete: (results: CsvParseResult, aFile: any) => void) {
  parse(file, { ...csvParseOptions, complete: onComplete })
}

export function downloadCsvFile(dataUrl: string,
  onComplete: (results: CsvParseResult, aFile: any) => void,
  onError: (error: Error, file: string) => void
) {
  parse(dataUrl, { ...csvParseOptions, download: true, complete: onComplete, error: onError })
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
  data?: IDataSet
  datasetName?: string
}
interface IImportFromCsvFileArgs {
  file: File
}
interface IImportFromCsvUrlArgs {
  url: string
}
type IImportFromCsvArgs = IImportFromCsvContentArgs | IImportFromCsvFileArgs | IImportFromCsvUrlArgs

export function initiateImportFromCsv(options: IImportFromCsvArgs) {
  // The importer plugin is used to import a csv string into a dataset.
  insertImporterTile({
    contentType: 'text/csv',
    name: "Importer",
    file: "file" in options ? options.file : undefined,
    targetDatasetName: "data" in options ? options.data?.name : undefined,
    datasetName: "datasetName" in options ? options.datasetName : undefined,
    text: "text" in options ? options.text : undefined,
    url: "url" in options ? options.url : undefined
  })
}

