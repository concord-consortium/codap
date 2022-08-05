import { parse } from "papaparse"

import abaloneCsv from "./abalone.csv"
import mammalsCsv from "./mammals.csv"

export const sampleData = ["abalone", "mammals"] as const
export type SampleType = typeof sampleData[number]

const sampleMap: Record<SampleType, string> = {
  abalone: abaloneCsv,
  mammals: mammalsCsv
}

type OnImportType = (data: Array<Record<string, string>>, fName?: string) => void

export function importSample(sample: SampleType, onImport: OnImportType) {
  const dataUrl = sampleMap[sample]
  parse(dataUrl, { download: true, header: true, complete: ({ data }: any) => onImport(data, sample) })
}
