import { DataSet, toCanonical } from "../../models/data/data-set"
import { diItemCountHandler } from "./item-count-handler"

describe("DataInteractive ItemCountHandler", () => {
  const handler = diItemCountHandler
  it("get works as expected", () => {
    expect(handler.get?.({})?.success).toBe(false)

    const dataset = DataSet.create({ name: "data" })
    expect(handler.get?.({ dataContext: dataset })?.values).toBe(0)
    
    dataset.addAttribute({ name: "a1" })
    dataset.addCases(toCanonical(dataset, [{ a1: 1 }]))
    expect(handler.get?.({ dataContext: dataset })?.values).toBe(1)
  })
})
