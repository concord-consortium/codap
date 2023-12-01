import {FormatLocaleDefinition, format, formatLocale} from "d3-format"

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
})
