import {FormatLocaleDefinition, format, formatLocale} from "d3-format"
import {
  between, checkNumber, chooseDecimalPlaces, extractNumeric, isFiniteNumber, isNumber, isValueNonEmpty
} from "./math-utils"

// default formatting except uses ASCII minus sign
const asciiLocale = formatLocale({ minus: "-" } as FormatLocaleDefinition)

describe("math-utils", () => {

  describe("d3-format", () => {
    const defaultFormat = format("")
    const asciiFormat = asciiLocale.format("")
    it("supports grouping by default but locale can be configured to ignore grouping", () => {
      const defaultGroupFormat = format(",~g")
      const asciiGroupFormat = asciiLocale.format(",~g")
      expect(defaultGroupFormat(1234)).toBe("1,234")
      expect(asciiGroupFormat(1234)).toBe("1234")
    })
    it("supports currency by default but locale can be configured to ignore currency", () => {
      const defaultCurrencyFormat = format("$~g")
      const asciiCurrencyFormat = asciiLocale.format("$~g")
      expect(defaultCurrencyFormat(123)).toBe("$123")
      expect(asciiCurrencyFormat(123)).toBe("123")
    })
    it("locale can be configured to use ASCII hyphen for minus sign", () => {
      expect(defaultFormat(-1)).not.toBe("-1")
      expect(asciiFormat(-1)).toBe("-1")
    })
  })

  describe("between", () => {
    it("should return true if the value is between the min and max values", () => {
      expect(between(1, 0, 2)).toBe(true)
      expect(between(0, 0, 2)).toBe(true)
      expect(between(2, 0, 2)).toBe(true)
    })
    it("should return false if the value is not between the min and max values", () => {
      expect(between(-1, 0, 2)).toBe(false)
      expect(between(3, 0, 2)).toBe(false)
      expect(between(NaN, 0, 2)).toBe(false)
      expect(between(Infinity, 0, 2)).toBe(false)
    })
  })

  describe("isFiniteNumber", () => {
    it("should return true for finite numbers and false for non-finite numbers", () => {
      expect(isFiniteNumber(1)).toBe(true)
      expect(isFiniteNumber(1.1)).toBe(true)
      expect(isFiniteNumber(0)).toBe(true)
      expect(isFiniteNumber(Infinity)).toBe(false)
      expect(isFiniteNumber(-Infinity)).toBe(false)
      expect(isFiniteNumber(NaN)).toBe(false)
    })
    it("should return false for non-numbers", () => {
      expect(isFiniteNumber("")).toBe(false)
      expect(isFiniteNumber("foo")).toBe(false)
      expect(isFiniteNumber({})).toBe(false)
      expect(isFiniteNumber([])).toBe(false)
      expect(isFiniteNumber(null)).toBe(false)
      expect(isFiniteNumber(undefined)).toBe(false)
      expect(isFiniteNumber(true)).toBe(false)
      expect(isFiniteNumber(false)).toBe(false)
      expect(isFiniteNumber(() => {})).toBe(false)
    })
  })

  describe("isValueNonEmpty", () => {
    it("should return false for empty values", () => {
      expect(isValueNonEmpty("")).toBe(false)
      expect(isValueNonEmpty(null)).toBe(false)
      expect(isValueNonEmpty(undefined)).toBe(false)
    })

    it("should return true for non-empty values", () => {
      expect(isValueNonEmpty("non-empty")).toBe(true)
      expect(isValueNonEmpty(0)).toBe(true)
      expect(isValueNonEmpty(false)).toBe(true)
    })
  })

  describe("isNumber", () => {
    it("should return true for numbers", () => {
      expect(isNumber(0)).toBe(true)
      expect(isNumber("0")).toBe(true)
      expect(isNumber(1.23)).toBe(true)
      expect(isNumber("1.23")).toBe(true)
    })

    it("should return false for non-numbers", () => {
      expect(isNumber("")).toBe(false)
      expect(isNumber("abc")).toBe(false)
      expect(isNumber(null)).toBe(false)
      expect(isNumber(undefined)).toBe(false)
    })
  })

  describe("checkNumber", () => {
    it("should return [true, number] for numbers", () => {
      expect(checkNumber(0)).toEqual([true, 0])
      expect(checkNumber("0")).toEqual([true, 0])
      expect(checkNumber(1.23)).toEqual([true, 1.23])
      expect(checkNumber("1.23")).toEqual([true, 1.23])
    })
    it("should return [false] for non-numbers", () => {
      expect(checkNumber("")).toEqual([false])
      expect(checkNumber(" ")).toEqual([false])
      expect(checkNumber("abc")).toEqual([false])
      expect(checkNumber(null)).toEqual([false])
      expect(checkNumber(undefined)).toEqual([false])
    })
  })

  describe("extractNumeric", () => {
    it("should return null for empty values", () => {
      expect(extractNumeric("")).toBe(null)
      expect(extractNumeric(null)).toBe(null)
      expect(extractNumeric(undefined)).toBe(null)
    })

    it("should return the number for non-empty values", () => {
      expect(extractNumeric("0")).toBe(0)
      expect(extractNumeric("1.23")).toBe(1.23)
      expect(extractNumeric(0)).toBe(0)
      expect(extractNumeric(1.23)).toBe(1.23)
      expect(extractNumeric(false)).toBe(0)
      expect(extractNumeric(true)).toBe(1)
      expect(extractNumeric("1e3")).toBe(1000)
      expect(extractNumeric("1e-3")).toBe(0.001)
      expect(extractNumeric("Infinity")).toBe(Infinity)
      expect(extractNumeric("-Infinity")).toBe(-Infinity)
      expect(extractNumeric("aa123bbb")).toBe(123)
      expect(extractNumeric("123aa456")).toBe(123456)
    })
  })

  describe("chooseDecimalPlaces", () => {
    it("should return no decimals for large spans", () => {
      expect(chooseDecimalPlaces(50.1, 0, 100)).toBe("50")
      expect(chooseDecimalPlaces(-45.9, -100, 10)).toBe("-46")
    })

    it("should return 1 decimal for medium spans", () => {
      expect(chooseDecimalPlaces(1.23, 0, 10)).toBe("1.2")
      expect(chooseDecimalPlaces(-1.23, -10, 0)).toBe("-1.2")
    })

    it("should return 2 decimals for small spans", () => {
      expect(chooseDecimalPlaces(0.123, 0, 1)).toBe("0.12")
      expect(chooseDecimalPlaces(-0.123, -1, 0)).toBe("-0.12")
    })

    it("should return 3 decimals for tiny spans", () => {
      expect(chooseDecimalPlaces(0.0123, 0, 0.1)).toBe("0.012")
      expect(chooseDecimalPlaces(-0.0123, -0.1, 0)).toBe("-0.012")
    })

    it("should return an extra decimal place when near a boundary", () => {
      expect(chooseDecimalPlaces(0.01234, 0, 1)).toBe("0.012")
      expect(chooseDecimalPlaces(0.91234, 0, 1)).toBe("0.912")
    })

  })
})
