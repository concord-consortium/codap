import { DataSet, toCanonical } from "./data-set"
import { selectCasesNotificationForDelta } from "./data-set-notifications"

describe("selectCasesNotificationForDelta", () => {
  function makeDataSet() {
    const data = DataSet.create({ name: "data" })
    data.addAttribute({ id: "aId", name: "a" })
    data.addCases(toCanonical(data, [
      { __id__: "i1", a: 1 }, { __id__: "i2", a: 2 }, { __id__: "i3", a: 3 }
    ]))
    data.validateCases()
    return data
  }
  const caseId = (data: ReturnType<typeof makeDataSet>, itemId: string) => data.getItemChildCaseId(itemId)!

  it("returns undefined when both deltas are empty", () => {
    const data = makeDataSet()
    expect(selectCasesNotificationForDelta(data, [], [])).toBeUndefined()
  })

  it("builds a selectCases notification with added cases (extend) and no removed cases", () => {
    const data = makeDataSet()
    const note = selectCasesNotificationForDelta(data, [caseId(data, "i1"), caseId(data, "i2")], [])
    expect(note).toBeDefined()
    expect(note!.message.values.operation).toBe("selectCases")
    expect(note!.message.values.result.extend).toBe(true)
    expect(note!.message.values.result.cases).toHaveLength(2)
    expect(note!.message.values.result.removedCases).toEqual([])
  })

  it("includes removedCases when a removed delta is provided", () => {
    const data = makeDataSet()
    const note = selectCasesNotificationForDelta(data, [], [caseId(data, "i3")])
    expect(note).toBeDefined()
    // V2 convention: no added cases => cases is undefined (not an empty array)
    expect(note!.message.values.result.cases).toBeUndefined()
    expect(note!.message.values.result.removedCases).toHaveLength(1)
    expect(note!.message.values.result.extend).toBe(true)
  })
})
