import { DataSet } from "../../models/data/data-set"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { convertToDate } from "../../utilities/date-utils"
import { dataDisplayGetNumericExtent } from "./data-display-value-utils"

describe("dataDisplayGetNumericExtent", () => {
  it("returns the min and max of a numeric attribute", () => {
    const { dataset, a3, a4 } = setupTestDataset()
    expect(dataDisplayGetNumericExtent(dataset, a3.id)).toEqual([1, 6])
    expect(dataDisplayGetNumericExtent(dataset, a4.id)).toEqual([-6, -1])
  })

  it("ignores missing values", () => {
    const { dataset, a3 } = setupTestDataset()
    const firstItemId = dataset.itemIds[0]
    dataset.setCaseValues([{ __id__: firstItemId, [a3.id]: "" }])
    expect(dataDisplayGetNumericExtent(dataset, a3.id)).toEqual([2, 6])
  })

  it("returns undefined when there are no values or no dataset", () => {
    const { dataset } = setupTestDataset()
    const empty = dataset.addAttribute({ name: "empty", userType: "numeric" })
    expect(dataDisplayGetNumericExtent(dataset, empty.id)).toBeUndefined()
    expect(dataDisplayGetNumericExtent(undefined, "anything")).toBeUndefined()
  })

  it("returns epoch seconds for a date attribute", () => {
    const dataset = DataSet.create({ name: "dates", collections: [{ name: "Events" }] })
    const when = dataset.addAttribute({ name: "when", userType: "date" })
    dataset.addCases([{ when: "2020-01-11" }, { when: "2020-01-01" }], { canonicalize: true })
    dataset.validateCases()
    const early = convertToDate("2020-01-01")!.valueOf() / 1000
    const late = convertToDate("2020-01-11")!.valueOf() / 1000
    expect(dataDisplayGetNumericExtent(dataset, when.id)).toEqual([early, late])
  })
})
