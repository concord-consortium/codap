import {
  addCombinedDateTimeAttribute, combineDateTimeFormula, defaultCombinedAttributeName, getCombineDateTimePartners,
  getCombineDateTimePreview, getDateTimeRoles, isDateOrTimeAttribute, isTimeOnlyAttribute
} from "./combine-date-time"
import { DataSet, IDataSet, toCanonical } from "./data-set"

function createData() {
  const data = DataSet.create({ name: "data" })
  data.addAttribute({ id: "name", name: "name" })
  data.addAttribute({ id: "day", name: "Obs Date" })
  data.addAttribute({ id: "time", name: "time" })
  data.addAttribute({ id: "stamp", name: "stamp" })
  data.addAttribute({ id: "clock", name: "clock" })
  data.addCases(toCanonical(data, [
    { name: "a", "Obs Date": "2026-10-27", time: "13:45", stamp: "2026-10-27 08:00", clock: "1:45 PM" },
    { name: "b", "Obs Date": "2026-10-28", time: "", stamp: "2026-10-28 09:00", clock: "2:00 am" }
  ]))
  return data
}

function attr(data: IDataSet, id: string) {
  return data.getAttribute(id)!
}

describe("combine date/time", () => {
  it("identifies time-only and date/time attributes", () => {
    const data = createData()
    expect(isTimeOnlyAttribute(attr(data, "time"))).toBe(true)
    expect(isTimeOnlyAttribute(attr(data, "clock"))).toBe(true)
    expect(isTimeOnlyAttribute(attr(data, "day"))).toBe(false)
    expect(isTimeOnlyAttribute(attr(data, "name"))).toBe(false)

    expect(isDateOrTimeAttribute(attr(data, "day"))).toBe(true)
    expect(isDateOrTimeAttribute(attr(data, "stamp"))).toBe(true)
    expect(isDateOrTimeAttribute(attr(data, "time"))).toBe(true)
    expect(isDateOrTimeAttribute(attr(data, "name"))).toBe(false)
  })

  it("treats an attribute with no values as neither", () => {
    const data = createData()
    data.addAttribute({ id: "empty", name: "empty" })
    expect(isTimeOnlyAttribute(attr(data, "empty"))).toBe(false)
    expect(isDateOrTimeAttribute(attr(data, "empty"))).toBe(false)
  })

  it("finds partners, excluding non-date attributes and time-only pairs", () => {
    const data = createData()
    const ids = (attrId: string) => getCombineDateTimePartners(data, attrId).map(a => a.id)
    expect(ids("day")).toEqual(["time", "stamp", "clock"])
    expect(ids("time")).toEqual(["day", "stamp"])
    expect(ids("name")).toEqual([])
    expect(ids("missing")).toEqual([])
  })

  it("has no partners when there is only one date/time attribute", () => {
    const data = DataSet.create({ name: "data" })
    data.addAttribute({ id: "day", name: "day" })
    data.addAttribute({ id: "name", name: "name" })
    data.addCases(toCanonical(data, [{ day: "2026-10-27", name: "a" }]))
    expect(getCombineDateTimePartners(data, "day")).toEqual([])
  })

  it("assigns the time role to a time-only attribute regardless of order", () => {
    const data = createData()
    const roles1 = getDateTimeRoles(attr(data, "time"), attr(data, "day"))
    expect(roles1.dateAttr.id).toBe("day")
    expect(roles1.timeAttr.id).toBe("time")
    const roles2 = getDateTimeRoles(attr(data, "day"), attr(data, "time"))
    expect(roles2.dateAttr.id).toBe("day")
    expect(roles2.timeAttr.id).toBe("time")
    // two full dates: the first supplies the date
    const roles3 = getDateTimeRoles(attr(data, "stamp"), attr(data, "day"))
    expect(roles3.dateAttr.id).toBe("stamp")
    expect(roles3.timeAttr.id).toBe("day")
  })

  it("builds a formula, escaping names that aren't valid identifiers", () => {
    expect(combineDateTimeFormula("Obs Date", "time")).toBe(
      "date(year(`Obs Date`), month(`Obs Date`), dayOfMonth(`Obs Date`), hours(time), minutes(time), seconds(time))"
    )
  })

  it("suggests a unique default name", () => {
    const data = createData()
    const roles = getDateTimeRoles(attr(data, "day"), attr(data, "time"))
    expect(defaultCombinedAttributeName(data, roles)).toBe("Obs Date_time")
    data.addAttribute({ name: "Obs Date_time" })
    expect(defaultCombinedAttributeName(data, roles)).toBe("Obs Date_time2")
  })

  it("adds a formula attribute after the last source attribute", () => {
    const data = createData()
    const roles = getDateTimeRoles(attr(data, "day"), attr(data, "time"))
    const newAttr = addCombinedDateTimeAttribute(data, roles, "when")!
    expect(newAttr.name).toBe("when")
    expect(newAttr.formula?.display).toBe(combineDateTimeFormula("Obs Date", "time"))
    expect(data.attributes.map(a => a?.name)).toEqual(["name", "Obs Date", "time", "when", "stamp", "clock"])
  })

  it("makes the requested name unique and falls back to a default for a blank name", () => {
    const data = createData()
    const roles = getDateTimeRoles(attr(data, "day"), attr(data, "time"))
    expect(addCombinedDateTimeAttribute(data, roles, "name")?.name).toBe("name2")
    expect(addCombinedDateTimeAttribute(data, roles, "  ")?.name).toBe("Obs Date_time")
  })

  it("adds the attribute to the more deeply nested source collection", () => {
    const data = createData()
    // move "Obs Date" to a new parent collection
    data.moveAttributeToNewCollection("day")
    const childCollection = data.getCollectionForAttribute("time")!
    const roles = getDateTimeRoles(attr(data, "day"), attr(data, "time"))
    const newAttr = addCombinedDateTimeAttribute(data, roles, "when")!
    expect(data.getCollectionForAttribute(newAttr.id)?.id).toBe(childCollection.id)
    expect(childCollection.attributes.map(a => a?.name)).toEqual(["name", "time", "when", "stamp", "clock"])
  })

  describe("getCombineDateTimePreview", () => {
    it("previews the first case that has both a date and a time", () => {
      const data = createData()
      const preview = getCombineDateTimePreview(getDateTimeRoles(attr(data, "day"), attr(data, "clock")))
      expect(preview).toEqual({ dateValue: "2026-10-27", timeValue: "1:45 PM", result: "10/27/2026, 1:45 PM" })
    })

    it("skips cases with a missing time", () => {
      const data = createData()
      data.setCaseValues([{ __id__: data.items[0].__id__, time: "" }])
      data.setCaseValues([{ __id__: data.items[1].__id__, time: "08:05:30" }])
      const preview = getCombineDateTimePreview(getDateTimeRoles(attr(data, "day"), attr(data, "time")))
      expect(preview).toEqual({ dateValue: "2026-10-28", timeValue: "08:05:30", result: "10/28/2026, 8:05:30 AM" })
    })

    it("returns undefined when no case has both values", () => {
      const data = createData()
      data.setCaseValues(data.items.map(item => ({ __id__: item.__id__, time: "" })))
      expect(getCombineDateTimePreview(getDateTimeRoles(attr(data, "day"), attr(data, "time")))).toBeUndefined()
    })
  })
})
