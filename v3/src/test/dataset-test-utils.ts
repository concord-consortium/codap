import { DataSet } from "../models/data/data-set"
import { AppHistoryService } from "../models/history/app-history-service"
import { createDataSetMetadata } from "../models/shared/data-set-metadata"

export const testCases = [
  { a1: "a", a2: "x", a3: 1, a4: -1 },
  { a1: "b", a2: "y", a3: 2, a4: -2 },
  { a1: "a", a2: "z", a3: 3, a4: -3 },
  { a1: "b", a2: "z", a3: 4, a4: -4 },
  { a1: "a", a2: "x", a3: 5, a4: -5 },
  { a1: "b", a2: "y", a3: 6, a4: -6 },
]
interface ITestDatasetOptions {
  datasetName?: string
}
export const setupTestDataset = (options?: ITestDatasetOptions) => {
  const dataset = DataSet.create({
    name: options?.datasetName ?? "data",
    collections: [
      { name: "collection1" },
      { name: "collection2" },
      { name: "collection3" }
    ]
  }, {historyService: new AppHistoryService()})
  const metadata = createDataSetMetadata(dataset)
  const [c1, c2] = dataset.collections
  const a1 = dataset.addAttribute({ name: "a1" }, { collection: c1.id })
  const a2 = dataset.addAttribute({ name: "a2" }, { collection: c2.id })
  const a3 = dataset.addAttribute({ name: "a3" })
  const a4 = dataset.addAttribute({ name: "a4" })
  dataset.addCases(testCases, { canonicalize: true })
  dataset.validateCases()
  return { dataset, metadata, c1, c2, a1, a2, a3, a4 }
}

export function setupForCaseTest() {
  const { dataset, a3 } = setupTestDataset()
  const item = dataset.getItemAtIndex(4)!
  const itemId = item.__id__
  const aCase = Array.from(dataset.caseInfoMap.values())[1].groupedCase
  const caseId = aCase.__id__
  return { dataContext: dataset, item, itemId, aCase, caseId, a3 }
}
