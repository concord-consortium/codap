import {FormatLocaleDefinition, format, formatLocale} from "d3-format"
import {between, isFiniteNumber} from "./math-utils"

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
      it("should return true for numbers that are strings", () => {
        expect(isFiniteNumber("1")).toBe(true)
        expect(isFiniteNumber("1.1")).toBe(true)
        expect(isFiniteNumber("0")).toBe(true)
        expect(isFiniteNumber("Infinity")).toBe(false)
        expect(isFiniteNumber("-Infinity")).toBe(false)
        expect(isFiniteNumber("NaN")).toBe(false)
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
  })
})
