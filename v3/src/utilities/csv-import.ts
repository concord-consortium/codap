import { parse, ParseResult } from "papaparse"
import { DataSet } from "../models/data/data-set"

type RowType = Record<string, string>
export type CsvParseResult = ParseResult<RowType>

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
  // trim all values
  results.data.forEach(row => {
    for (const key in row) {
      row[key] = typeof row[key] === 'string' ? row[key].trim() : row[key]
    }
  })

  // Remove extension
  // From https://stackoverflow.com/questions/4250364/how-to-trim-a-file-extension-from-a-string-in-javascript
  const name = filename.replace(/\.[^/.]+$/, "")
  const ds = DataSet.create({ name })
  // add attributes (extracted from first case)
  for (const pName in results.data[0]) {
    ds.addAttribute({name: pName.trim()})
  }
  // add cases
  ds.addCases(results.data, { canonicalize: true })

  return ds
}
