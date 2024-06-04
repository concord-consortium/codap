import { DataSet } from "../../models/data/data-set"

export const testCases = [
  { a1: "a", a2: "x", a3: 1 },
  { a1: "b", a2: "y", a3: 2 },
  { a1: "a", a2: "z", a3: 3 },
  { a1: "b", a2: "z", a3: 4 },
  { a1: "a", a2: "x", a3: 5 },
  { a1: "b", a2: "y", a3: 6 },
]
export const setupTestDataset = () => {
  const dataset = DataSet.create({
    name: "data",
    collections: [
      { name: "collection1" },
      { name: "collection2" },
      { name: "collection3" }
    ]
  })
  const [c1, c2] = dataset.collections
  const a1 = dataset.addAttribute({ name: "a1" }, { collection: c1.id })
  const a2 = dataset.addAttribute({ name: "a2" }, { collection: c2.id })
  const a3 = dataset.addAttribute({ name: "a3" })
  dataset.addCases(testCases, { canonicalize: true })
  return { dataset, c1, c2, a1, a2, a3 }
}
