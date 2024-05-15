import { CollectionModel } from "../../models/data/collection"
import { DataSet, toCanonical } from "../../models/data/data-set"

export const testCases = [
  { a1: "a", a2: "x", a3: 1 },
  { a1: "b", a2: "y", a3: 2 },
  { a1: "a", a2: "z", a3: 3 },
  { a1: "b", a2: "z", a3: 4 },
  { a1: "a", a2: "x", a3: 5 },
  { a1: "b", a2: "y", a3: 6 },
]
export const setupTestDataset = () => {
  const dataset = DataSet.create({ name: "data" })
  const c1 = CollectionModel.create({ name: "collection1" })
  const c2 = CollectionModel.create({ name: "collection2" })
  dataset.addCollection(c1)
  dataset.addCollection(c2)
  const a1 = dataset.addAttribute({ name: "a1" }, { collection: c1.id })
  const a2 = dataset.addAttribute({ name: "a2" }, { collection: c2.id })
  const a3 = dataset.addAttribute({ name: "a3" })
  dataset.addCases(toCanonical(dataset, testCases))
  return { dataset, c1, c2, a1, a2, a3 }
}
