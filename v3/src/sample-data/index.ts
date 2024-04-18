import { IDataSet } from "../models/data/data-set"
import { convertParsedCsvToDataSet, CsvParseResult, downloadCsvFile } from "../utilities/csv-import"
import abaloneCsv from "./abalone.csv"
import catsCsv from "./cats.csv"
import coastersCsv from "./roller-coasters.csv"
import colorsCsv from "./colors.csv"
import mammalsCsv from "./mammals.csv"
import fourCsv from "./four.csv"

export const sampleData = ["Abalone", "Cats", "Coasters", "Colors", "Four", "Mammals"] as const
export type SampleType = typeof sampleData[number]

const sampleMap: Record<SampleType, string> = {
  Abalone: abaloneCsv,
  Cats: catsCsv,
  Coasters: coastersCsv,
  Colors: colorsCsv,
  Four: fourCsv,
  Mammals: mammalsCsv
}

export function importSample(sample: SampleType): Promise<IDataSet> {
  const dataUrl = sampleMap[sample]
  return new Promise((resolve, reject) => {
    downloadCsvFile(dataUrl, (results: CsvParseResult) => {
      const ds = convertParsedCsvToDataSet(results, sample)
      if (ds) {
        resolve(ds)
      }
      else {
        reject()
      }
    })
  })
}
