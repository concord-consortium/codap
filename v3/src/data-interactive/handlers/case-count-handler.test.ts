import { DataSet, toCanonical } from "../../models/data/data-set"
import { diCaseCountHandler } from "./case-count-handler"

describe("DataInteractive CaseCountHandler", () => {
  const handler = diCaseCountHandler
  it("get works as expected", () => {
    expect(handler.get?.({})?.success).toBe(false)

    const dataset = DataSet.create({ name: "data" })
    dataset.addAttribute({ name: "a1" })
    dataset.addAttribute({ name: "a2" })
    dataset.addCases(toCanonical(dataset, [
      { a1: 1, a2: 1 },
      { a1: 2, a2: 2 },
      { a1: 1, a2: 3 },
      { a1: 2, a2: 4 }
    ]))
    dataset.moveAttributeToNewCollection(dataset.attributes[0].id)

    expect(handler.get?.({ collection: dataset.collections[0] })?.success).toBe(false)
    expect(handler.get?.({ dataContext: dataset, collection: dataset.collections[0] })?.values).toBe(2)
    expect(handler.get?.({ dataContext: dataset, collection: dataset.ungrouped })?.values).toBe(4)
  })
})
