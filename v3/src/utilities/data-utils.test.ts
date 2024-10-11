import {
  compareValues, kTypeBoolean, kTypeDate, kTypeError, kTypeNaN, kTypeNull, kTypeNumber, kTypeString,
  sortableValue, typeCode
} from "./data-utils"
import { parseDate } from "./date-parser"

describe("Data utilities", () => {

  it("typeCode", () => {
    expect(typeCode(new Error("Error!"))).toBe(kTypeError)
    expect(typeCode(NaN)).toBe(kTypeNaN)
    expect(typeCode(undefined)).toBe(kTypeNull)
    expect(typeCode(null)).toBe(kTypeNull)
    expect(typeCode("")).toBe(kTypeString)
    expect(typeCode("1")).toBe(kTypeString)
    expect(typeCode("foo")).toBe(kTypeString)
    expect(typeCode(true)).toBe(kTypeBoolean)
    expect(typeCode(false)).toBe(kTypeBoolean)
    expect(typeCode(0)).toBe(kTypeNumber)
    expect(typeCode(new Date())).toBe(kTypeDate)
    expect(typeCode("2024-10-09")).toBe(kTypeDate)
  })

  it("sortableValue", () => {
    const error = new Error("Error!")
    expect(sortableValue(error)).toEqual({ type: kTypeError, value: error })
    expect(sortableValue(NaN)).toEqual({ type: kTypeNaN, value: NaN })
    expect(sortableValue(undefined)).toEqual({ type: kTypeNull, value: undefined })
    expect(sortableValue(null)).toEqual({ type: kTypeNull, value: null })
    expect(sortableValue("")).toEqual({ type: kTypeString, value: "" })
    expect(sortableValue("1")).toEqual({ type: kTypeNumber, value: 1 })
    expect(sortableValue("foo")).toEqual({ type: kTypeString, value: "foo" })
    expect(sortableValue(true)).toEqual({ type: kTypeString, value: true })
    expect(sortableValue(false)).toEqual({ type: kTypeString, value: false })
    expect(sortableValue(0)).toEqual({ type: kTypeNumber, value: 0 })
    const nowDate = new Date()
    expect(sortableValue(nowDate)).toEqual({ type: kTypeNumber, value: nowDate.getTime() / 1000 })
    const strDate = "2024-10-09"
    const parsedDate = parseDate(strDate)
    expect(sortableValue(strDate)).toEqual({ type: kTypeNumber, value: (parsedDate?.getTime() ?? NaN) / 1000 })
  })

  it("compareValues", () => {
    const error = new Error("Error!")
    const nowDate = new Date()
    const values = [error, NaN, undefined, null, "", "1", "foo", true, false, 0, nowDate, "2024-10-09"]
    const results = [
      ["=", "<", "<", "<", "<", "<", "<", "<", "<", "<", "<", "<"], // error
      [">", "=", "<", "<", "<", "<", "<", "<", "<", "<", "<", "<"], // NaN
      [">", ">", "=", "=", "<", "<", "<", "<", "<", "<", "<", "<"], // undefined
      [">", ">", "=", "=", "<", "<", "<", "<", "<", "<", "<", "<"], // null
      [">", ">", ">", ">", "=", "<", "<", "<", "<", "<", "<", "<"], // ""
      [">", ">", ">", ">", ">", "=", ">", ">", ">", ">", "<", "<"], // "1"
      [">", ">", ">", ">", ">", "<", "=", "<", ">", "<", "<", "<"], // "foo"
      [">", ">", ">", ">", ">", "<", ">", "=", ">", "<", "<", "<"], // true
      [">", ">", ">", ">", ">", "<", "<", "<", "=", "<", "<", "<"], // false
      [">", ">", ">", ">", ">", "<", ">", ">", ">", "=", "<", "<"], // 0
      [">", ">", ">", ">", ">", ">", ">", ">", ">", ">", "=", ">"], // new Date()
      [">", ">", ">", ">", ">", ">", ">", ">", ">", ">", "<", "="]  // "2024-10-09"
    ]
    const collator = new Intl.Collator("en-US", { sensitivity: 'base' })
    const compare = (v1: any, v2: any) => {
      const result = compareValues(v1, v2, collator.compare)
      if (result < 0) return "<"
      if (result > 0) return ">"
      return "="
    }
    for (let i1 = 0; i1 < values.length; ++i1) {
      for (let i2 = 0; i2 < values.length; ++i2) {
        expect(compare(values[i1], values[i2])).toBe(results[i1][i2])
      }
    }
  })

})
