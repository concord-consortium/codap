import { computed, makeObservable, reaction } from "mobx"
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
    const filtered = new FilteredCases({ source: data })
    expect(filtered.caseIds.length).toBe(3)
    expect(filtered.caseIds).toEqual(["c1", "c2", "c3"])
    expect(filtered.hasCaseId("c1")).toBe(true)
    expect(filtered.hasCaseId("c3")).toBe(true)
    filtered.destroy()
  })

  it("handles construction with a filter", () => {
    const filtered = new FilteredCases({
      source: data,
      filter: (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                                 isFinite(_data.getNumeric(caseId, "yId") ?? NaN) })
    expect(filtered.caseIds.length).toBe(1)
    expect(filtered.caseIds).toEqual(["c1"])
    expect(filtered.hasCaseId("c1")).toBe(true)
    expect(filtered.hasCaseId("c3")).toBe(false)
    filtered.destroy()
  })

  it("handles filtering when adding/removing cases", () => {
    const filtered = new FilteredCases({
      source: data,
      filter: (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                                 isFinite(_data.getNumeric(caseId, "yId") ?? NaN) })
    data.addCases([{ __id__: "c4", xId: 4, yId: 4 }])
    expect(filtered.caseIds.length).toBe(2)
    expect(filtered.caseIds).toEqual(["c1", "c4"])
    expect(filtered.hasCaseId("c4")).toBe(true)

    data.removeCases(["c1"])
    // without a DataConfigurationModel, we have to invalidate manually
    filtered.invalidateCases()
    expect(filtered.caseIds.length).toBe(1)
    expect(filtered.caseIds).toEqual(["c4"])
    expect(filtered.hasCaseId("c1")).toBe(false)

    filtered.destroy()
  })

  it("handles updated values which change filtering (no listener)", () => {
    const filtered = new FilteredCases({
      source: data,
      filter: (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                                 isFinite(_data.getNumeric(caseId, "yId") ?? NaN) })
    data.setCaseValues([{ __id__: "c3", xId: 3 }])
    expect(filtered.caseIds.length).toBe(2)
    expect(filtered.caseIds).toEqual(["c1", "c3"])
    expect(filtered.hasCaseId("c3")).toBe(true)

    data.setCaseValues([{ __id__: "c3", xId: 4 }])
    expect(filtered.caseIds.length).toBe(2)
    expect(filtered.caseIds).toEqual(["c1", "c3"])
    expect(filtered.hasCaseId("c3")).toBe(true)

    data.setCaseValues([{ __id__: "c1", xId: "" }])
    expect(filtered.caseIds.length).toBe(1)
    expect(filtered.caseIds).toEqual(["c3"])
    expect(filtered.hasCaseId("c1")).toBe(false)

    filtered.destroy()
  })

  it("handles updated values which change filtering (listener)", () => {
    const handleSetCaseValues = jest.fn()
    const filtered = new FilteredCases({
      source: data,
      filter: (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                                 isFinite(_data.getNumeric(caseId, "yId") ?? NaN),
      onSetCaseValues: handleSetCaseValues })

    data.setCaseValues([{ __id__: "c3", xId: 3 }])
    expect(handleSetCaseValues).toHaveBeenCalledTimes(1)
    expect(handleSetCaseValues.mock.lastCall[1]).toEqual({ added: ["c3"], changed: [], removed: [] })

    data.setCaseValues([{ __id__: "c3", xId: 4 }])
    expect(handleSetCaseValues).toHaveBeenCalledTimes(2)
    expect(handleSetCaseValues.mock.lastCall[1]).toEqual({ added: [], changed: ["c3"], removed: [] })

    data.setCaseValues([{ __id__: "c1", xId: "" }])
    expect(handleSetCaseValues).toHaveBeenCalledTimes(3)
    expect(handleSetCaseValues.mock.lastCall[1]).toEqual({ added: [], changed: [], removed: ["c1"] })

    data.setCaseValues([{ __id__: "c1", xId: 1 }, { __id__: "c2", xId: 2.2 }, { __id__: "c3", xId: "" }])
    expect(handleSetCaseValues).toHaveBeenCalledTimes(4)
    expect(handleSetCaseValues.mock.lastCall[1]).toEqual({ added: ["c1"], changed: ["c2"], removed: ["c3"] })

    filtered.destroy()
  })

  it("handles setComputedCaseValues which change filtering", () => {
    const handleSetCaseValues = jest.fn()
    const filtered = new FilteredCases({
      source: data,
      filter: (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                                 isFinite(_data.getNumeric(caseId, "yId") ?? NaN),
      onSetCaseValues: handleSetCaseValues })

    // c3 gains a valid x value, becoming plottable (added)
    data.setComputedCaseValues([{ __id__: "c3", xId: 3 }], ["xId"])
    expect(handleSetCaseValues).toHaveBeenCalledTimes(1)
    expect(handleSetCaseValues.mock.lastCall[1]).toEqual({ added: ["c3"], changed: [], removed: [] })
    expect(filtered.caseIds).toEqual(["c1", "c3"])

    // c1 loses its x value, becoming non-plottable (removed)
    data.setComputedCaseValues([{ __id__: "c1", xId: "" }], ["xId"])
    expect(handleSetCaseValues).toHaveBeenCalledTimes(2)
    expect(handleSetCaseValues.mock.lastCall[1]).toEqual({ added: [], changed: [], removed: ["c1"] })
    expect(filtered.caseIds).toEqual(["c3"])

    filtered.destroy()
  })

  it("triggers observers on value changes which change filtering", () => {
    const filtered = new FilteredCases({
      source: data,
      filter: (_data, caseId) => isFinite(_data.getNumeric(caseId, "xId") ?? NaN) &&
                                 isFinite(_data.getNumeric(caseId, "yId") ?? NaN) })

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

  it("triggers direct reactions on caseIds when invalidateCases is called externally", () => {
    // Mirrors how DataConfigurationModel.invalidateCases() externally invalidates a
    // FilteredCases on dataset addCases (which doesn't trigger FilteredCases' own
    // handleAction listener since addCases isn't isCaseValueChangeAction).
    const filtered = new FilteredCases({ source: data })

    // Warm the cache so _isValidCaseIds is true before reaction installs.
    expect(filtered.caseIds.length).toBe(3)

    const trigger = jest.fn()
    reaction(() => filtered.caseIds, () => trigger())
    expect(trigger).toHaveBeenCalledTimes(0)

    // Adding cases doesn't notify FilteredCases (addCases isn't a value-change action).
    data.addCases(toCanonical(data, [{ __id__: "c4", x: 4, y: 4 }]))

    // Production code (DataConfigurationModel) explicitly calls invalidateCases here.
    filtered.invalidateCases()

    expect(filtered.caseIds.length).toBe(4)
    expect(trigger).toHaveBeenCalledTimes(1)

    filtered.destroy()
  })

  it("triggers reactions through an intermediate computed when invalidateCases is called externally", () => {
    // Mirrors the production caseDataHash path: a @computed that transitively reads
    // FilteredCases.caseIds, with a reaction observing the computed.
    const filtered = new FilteredCases({ source: data })

    class HashWrapper {
      constructor(public f: FilteredCases) {
        makeObservable(this, { caseIdsHash: computed })
      }
      get caseIdsHash() {
        return this.f.caseIds.join(",")
      }
    }
    const wrapper = new HashWrapper(filtered)

    // Warm both the FilteredCases cache and the wrapper computed.
    expect(wrapper.caseIdsHash).toBe("c1,c2,c3")

    const trigger = jest.fn()
    reaction(() => wrapper.caseIdsHash, () => trigger())
    expect(trigger).toHaveBeenCalledTimes(0)

    data.addCases(toCanonical(data, [{ __id__: "c4", x: 4, y: 4 }]))
    filtered.invalidateCases()

    expect(wrapper.caseIdsHash).toBe("c1,c2,c3,c4")
    expect(trigger).toHaveBeenCalledTimes(1)

    filtered.destroy()
  })
})
