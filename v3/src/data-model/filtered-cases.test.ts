import { reaction } from "mobx"
import { DataSet, IDataSet, toCanonical } from "./data-set"
import { FilteredCases } from "./filtered-cases"

describe("DerivedDataSet", () => {
  let data: IDataSet

  beforeEach(() => {
    data = DataSet.create()
    data.addAttribute({ id: "xId", name: "x" })
    data.addAttribute({ id: "yId", name: "y" })
    data.addCases(toCanonical(data, [
      { __id__: "c1", x: 1, y: 1 }, { __id__: "c2", x: 2 }, { __id__: "c3", y: 3 }
    ]))
  })

  it("handles construction without a filter", () => {
    const filtered = new FilteredCases(data)
    expect(filtered.caseIds.length).toBe(3)
    expect(filtered.caseIds).toEqual(["c1", "c2", "c3"])
    expect(filtered.hasCaseId("c1")).toBe(true)
    expect(filtered.hasCaseId("c3")).toBe(true)
    filtered.destroy()
  })

  it("handles construction with a filter", () => {
    const filtered = new FilteredCases(data,
      (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                         isFinite(_data.getNumeric(caseId, "yId") ?? NaN))
    expect(filtered.caseIds.length).toBe(1)
    expect(filtered.caseIds).toEqual(["c1"])
    expect(filtered.hasCaseId("c1")).toBe(true)
    expect(filtered.hasCaseId("c3")).toBe(false)
    filtered.destroy()
  })

  it("handles filtering when adding/removing cases", () => {
    const filtered = new FilteredCases(data,
      (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                         isFinite(_data.getNumeric(caseId, "yId") ?? NaN))
    data.addCases([{ __id__: "c4", xId: 4, yId: 4 }])
    expect(filtered.caseIds.length).toBe(2)
    expect(filtered.caseIds).toEqual(["c1", "c4"])
    expect(filtered.hasCaseId("c4")).toBe(true)

    data.removeCases(["c1"])
    expect(filtered.caseIds.length).toBe(1)
    expect(filtered.caseIds).toEqual(["c4"])
    expect(filtered.hasCaseId("c1")).toBe(false)

    filtered.destroy()
  })

  it("handles updated values which change filtering", () => {
    const filtered = new FilteredCases(data,
      (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                         isFinite(_data.getNumeric(caseId, "yId") ?? NaN))
    data.setCaseValues([{ __id__: "c3", xId: 3 }])
    expect(filtered.caseIds.length).toBe(2)
    expect(filtered.caseIds).toEqual(["c1", "c3"])
    expect(filtered.hasCaseId("c3")).toBe(true)

    data.setCaseValues([{ __id__: "c1", xId: "" }])
    expect(filtered.caseIds.length).toBe(1)
    expect(filtered.caseIds).toEqual(["c3"])
    expect(filtered.hasCaseId("c1")).toBe(false)

    filtered.destroy()
  })

  it("triggers observers on value changes which change filtering", () => {
    const filtered = new FilteredCases(data,
      (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                         isFinite(_data.getNumeric(caseId, "yId") ?? NaN))

    const trigger = jest.fn()
    reaction(() => filtered.caseIds, () => trigger())
    expect(trigger).toHaveBeenCalledTimes(0)

    data.setCaseValues([{ __id__: "c3", xId: 3 }])
    expect(trigger).toHaveBeenCalledTimes(1)
    expect(filtered.caseIds.length).toBe(2)
    expect(filtered.caseIds).toEqual(["c1", "c3"])

    data.setCaseValues([{ __id__: "c1", xId: "" }])
    expect(filtered.caseIds.length).toBe(1)
    expect(filtered.caseIds).toEqual(["c3"])
    expect(trigger).toHaveBeenCalledTimes(2)

    filtered.destroy()
  })
})
