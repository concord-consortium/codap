import { parse, ParseResult } from "papaparse"
import { DataSet } from "../models/data/data-set"

type RowType = Record<string, string>
export type CsvParseResult = ParseResult<RowType>

export function importCsvFile(file: File | null, onComplete: (results: CsvParseResult, aFile: any) => void) {
  parse(file, { comments: "#", header: true, complete: onComplete })
}

export function downloadCsvFile(dataUrl: string, onComplete: (results: CsvParseResult, aFile: any) => void) {
  parse(dataUrl, { download: true, comments: "#", header: true, complete: onComplete })
}

export function convertParsedCsvToDataSet(results: CsvParseResult, filename: string) {
  // Remove extension
  // From https://stackoverflow.com/questions/4250364/how-to-trim-a-file-extension-from-a-string-in-javascript
  const name = filename.replace(/\.[^/.]+$/, "")
  const ds = DataSet.create({ name })
  // add attributes (extracted from first case)
  for (const pName in results.data[0]) {
    ds.addAttribute({name: pName})
  }
  // add cases
  ds.addCases(results.data, { canonicalize: true })

  return ds
}
