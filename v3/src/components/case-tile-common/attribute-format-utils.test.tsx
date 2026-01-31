/* eslint-disable testing-library/render-result-naming-convention */
// The renderAttributeValue function is not a React Testing Library render function,
// but ESLint incorrectly flags variables named "result" that store its return value.
import {
  getNumFormatter, getNumFormatterForAttribute, renderAttributeValue, findLongestContentWidth
} from "./attribute-format-utils"
import { IAttribute } from "../../models/data/attribute"
import { kDefaultRowHeight } from "../case-table/case-table-types"

// Mock dependencies
jest.mock("../../hooks/use-measure-text", () => ({
  measureText: jest.fn((text: string) => text.length * 8) // Simple mock: 8 pixels per character
}))

jest.mock("../../models/boundaries/boundary-types", () => ({
  getBoundaryValueFromString: jest.fn((str: string) => {
    if (str === "mock-boundary") {
      return {
        properties: {
          NAME: "Mock Boundary",
          THUMB: "data:image/png;base64,mock"
        }
      }
    }
    return null
  }),
  hasBoundaryThumbnail: jest.fn((obj: any) => obj?.properties?.THUMB != null)
}))

jest.mock("../../utilities/color-utils", () => ({
  parseColor: jest.fn((str: string) => {
    if (str === "red" || str === "#ff0000") return "#ff0000"
    return ""
  }),
  defaultPointColor: "#3f9aef"
}))

jest.mock("../../utilities/date-iso-utils", () => ({
  isStdISODateString: jest.fn((str: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(str))
}))

jest.mock("../../utilities/date-parser", () => ({
  parseDate: jest.fn((str: string) => {
    if (str === "2024-01-15" || str === "2024-01-15T10:30:00.000Z") {
      return new Date("2024-01-15T10:30:00.000Z")
    }
    return null
  })
}))

jest.mock("../../utilities/date-utils", () => ({
  formatDate: jest.fn((date: Date) => "01/15/2024")
}))

jest.mock("../../utilities/translation/locale", () => ({
  gLocale: { current: "en-US" }
}))

jest.mock("./checkbox-cell", () => ({
  CheckboxCell: ({ caseId, attrId }: { caseId: string; attrId: string }) =>
    <div data-testid="checkbox-cell" data-case-id={caseId} data-attr-id={attrId} />,
  isBoolean: (str: string) => str === "true" || str === "false"
}))

// Helper to create mock attributes
const createMockAttribute = (overrides?: Partial<IAttribute>): Partial<IAttribute> => ({
  id: "attr1",
  name: "TestAttr",
  type: undefined,
  userType: undefined,
  numPrecision: 2,
  units: "",
  length: 10,
  strValues: [],
  numValues: [],
  ...overrides
})

describe("attribute-format-utils", () => {

  describe("getNumFormatter", () => {
    it("should format numbers with specified precision", () => {
      const formatter = getNumFormatter(".2~f")
      expect(formatter(123.456)).toBe("123.46")
      expect(formatter(1.2)).toBe("1.2")
    })

    it("should handle grouping when specified", () => {
      const formatter = getNumFormatter(",.2~f")
      expect(formatter(1234.56)).toBe("1,234.56")
    })

    it("should handle negative zero correctly", () => {
      const formatter = getNumFormatter(".2~f")
      expect(formatter(-0.001)).toBe("0")
    })

    it("should use Unicode minus for negative numbers", () => {
      const formatter = getNumFormatter(".2~f")
      const result = formatter(-123.45)
      expect(result).toContain("123.45")
      expect(result.charCodeAt(0)).toBe(8722) // Unicode minus sign
    })

    it("should cache formatters for reuse", () => {
      const formatter1 = getNumFormatter(".2~f")
      const formatter2 = getNumFormatter(".2~f")
      expect(formatter1).toBe(formatter2) // Same function reference
    })
  })

  describe("getNumFormatterForAttribute", () => {
    it("should create formatter with attribute precision", () => {
      const attr = createMockAttribute({ numPrecision: 3 })
      const formatter = getNumFormatterForAttribute(attr as IAttribute)
      expect(formatter(123.456789)).toBe("123.457")
    })

    it("should include grouping for non-year types", () => {
      const isInferredYearType = Object.assign(() => false, { invalidate: () => {} })
      const attr = createMockAttribute({
        numPrecision: 2,
        isInferredYearType
      })
      const formatter = getNumFormatterForAttribute(attr as IAttribute)
      expect(formatter(1234.56)).toBe("1,234.56")
    })

    it("should exclude grouping for year types", () => {
      const isInferredYearType = Object.assign(() => true, { invalidate: () => {} })
      const attr = createMockAttribute({
        numPrecision: 0,
        isInferredYearType
      })
      const formatter = getNumFormatterForAttribute(attr as IAttribute)
      expect(formatter(2024)).toBe("2024")
    })
  })

  describe("renderAttributeValue", () => {

    describe("boundary thumbnails", () => {
      it("should render boundary thumbnail when available", () => {
        const attr = createMockAttribute({ type: "boundary" })
        const result = renderAttributeValue("mock-boundary", NaN, attr as IAttribute)

        expect(result.value).toBe("Mock Boundary")
        expect(result.content).toBeDefined()
        // Check that it's a span with boundary classes
        expect(result.content.type).toBe("span")
        expect(result.content.props.className).toContain("cell-boundary-thumb")
      })
    })

    describe("qualitative bars", () => {
      it("should render qualitative bar for valid percentage", () => {
        const attr = createMockAttribute({ type: "qualitative" })
        const result = renderAttributeValue("75", 75, attr as IAttribute)

        expect(result.value).toBe("75")
        expect(result.content.type).toBe("span")
        expect(result.content.props.className).toBe("cell-qualitative-backing")
      })

      it("should handle zero percent", () => {
        const attr = createMockAttribute({ type: "qualitative" })
        const result = renderAttributeValue("0", 0, attr as IAttribute)

        expect(result.value).toBe("0")
        expect(result.content).toBeDefined()
      })
    })

    describe("colors", () => {
      it("should render color swatch for color values", () => {
        const attr = createMockAttribute({ type: "color" })
        const result = renderAttributeValue("red", NaN, attr as IAttribute)

        expect(result.value).toBe("#ff0000")
        expect(result.content.type).toBe("div")
        expect(result.content.props.className).toBe("cell-color-swatch")
      })

      it("should render color swatch when no userType is set", () => {
        const attr = createMockAttribute({ userType: undefined })
        const result = renderAttributeValue("#ff0000", NaN, attr as IAttribute)

        expect(result.value).toBe("#ff0000")
        expect(result.content.props.className).toBe("cell-color-swatch")
      })
    })

    describe("checkboxes", () => {
      it("should render checkbox for boolean values", () => {
        const attr = createMockAttribute({ userType: "checkbox", id: "attr1" })
        const result = renderAttributeValue("true", NaN, attr as IAttribute, { caseId: "case1" })

        expect(result.value).toBe("true")
        expect(result.content.type.name).toBe("CheckboxCell")
      })
    })

    describe("numbers", () => {
      it("should format finite numbers", () => {
        const attr = createMockAttribute({ numPrecision: 2 })
        const result = renderAttributeValue("123.456", 123.456, attr as IAttribute)

        expect(result.value).toBe("123.46")
        expect(result.content.type).toBe("div")
        expect(result.content.props.className).toContain("cell-content")
        expect(result.content.props.className).toContain("numeric-format")
      })

      it("should append units when showUnits is true", () => {
        const attr = createMockAttribute({ numPrecision: 1, units: "kg" })
        const result = renderAttributeValue("42.5", 42.5, attr as IAttribute, { showUnits: true })

        expect(result.value).toBe("42.5 kg")
      })

      it("should not append units when showUnits is false", () => {
        const attr = createMockAttribute({ numPrecision: 1, units: "kg" })
        const result = renderAttributeValue("42.5", 42.5, attr as IAttribute, { showUnits: false })

        expect(result.value).toBe("42.5")
      })
    })

    describe("dates", () => {
      it("should format ISO date strings", () => {
        const attr = createMockAttribute({ userType: "date" })
        const result = renderAttributeValue("2024-01-15T10:30:00.000Z", NaN, attr as IAttribute)

        expect(result.value).toBe("01/15/2024")
        expect(result.content.type).toBe("div")
        expect(result.content.props.className).toBe("cell-content")
      })

      it("should format dates when userType is date", () => {
        const attr = createMockAttribute({ userType: "date" })
        const result = renderAttributeValue("2024-01-15", NaN, attr as IAttribute)

        expect(result.value).toBe("01/15/2024")
      })

      it("should wrap invalid dates in quotes", () => {
        const attr = createMockAttribute({ userType: "date" })
        const result = renderAttributeValue("not-a-date", NaN, attr as IAttribute)

        expect(result.value).toBe('"not-a-date"')
      })
    })

    describe("text/default", () => {
      it("should render plain text in a div", () => {
        const attr = createMockAttribute()
        const result = renderAttributeValue("Hello World", NaN, attr as IAttribute)

        expect(result.value).toBe("Hello World")
        expect(result.content.type).toBe("div")
        expect(result.content.props.className).toBe("cell-content")
        expect(result.content.props.children).toBe("Hello World")
      })

      it("should apply white-space: nowrap for single-line cells (default row height)", () => {
        const attr = createMockAttribute()
        const result = renderAttributeValue("Text", NaN, attr as IAttribute, {
          rowHeight: kDefaultRowHeight
        })

        expect(result.content.props.style.whiteSpace).toBe("nowrap")
        expect(result.content.props.style.WebkitLineClamp).toBe(0)
      })

      it("should apply WebkitLineClamp for multi-line cells (taller row height)", () => {
        const attr = createMockAttribute()
        const result = renderAttributeValue("Text", NaN, attr as IAttribute, {
          rowHeight: 50 // Greater than kDefaultRowHeight
        })

        expect(result.content.props.style.WebkitLineClamp).toBeGreaterThan(0)
        expect(result.content.props.style.whiteSpace).toBeUndefined()
      })
    })
  })

  describe("findLongestContentWidth", () => {
    it("should calculate width based on attribute name", () => {
      const attr = createMockAttribute({
        name: "LongAttributeName",
        length: 0,
        strValues: [],
        numValues: []
      })

      const width = findLongestContentWidth(attr as IAttribute)
      expect(width).toBeGreaterThan(0)
    })

    it("should include units in header width calculation", () => {
      const attrWithoutUnits = createMockAttribute({
        name: "Weight",
        units: "",
        length: 0,
        strValues: [],
        numValues: []
      })
      const attrWithUnits = createMockAttribute({
        name: "Weight",
        units: "kilograms",
        length: 0,
        strValues: [],
        numValues: []
      })

      const widthWithoutUnits = findLongestContentWidth(attrWithoutUnits as IAttribute)
      const widthWithUnits = findLongestContentWidth(attrWithUnits as IAttribute)

      expect(widthWithUnits).toBeGreaterThan(widthWithoutUnits)
    })

    it("should find longest value width", () => {
      const attr = createMockAttribute({
        name: "A",
        length: 3,
        strValues: ["short", "medium text", "very long text value"],
        numValues: [1, 2, 3]
      })

      const width = findLongestContentWidth(attr as IAttribute)
      expect(width).toBeGreaterThan(0)
      // Should be based on longest text
      expect(width).toBeGreaterThan(20)
    })

    it("should respect maximum auto column width", () => {
      const attr = createMockAttribute({
        name: "A",
        length: 1,
        strValues: ["x".repeat(1000)], // Very long string
        numValues: [1]
      })

      const width = findLongestContentWidth(attr as IAttribute)
      expect(width).toBeLessThanOrEqual(300) // kMaxAutoColumnWidth is typically 300
    })

    it("should respect minimum auto column width", () => {
      const attr = createMockAttribute({
        name: "A",
        length: 1,
        strValues: ["x"],
        numValues: [1]
      })

      const width = findLongestContentWidth(attr as IAttribute)
      expect(width).toBeGreaterThanOrEqual(50) // kMinAutoColumnWidth is 50
    })
  })
})
/* eslint-enable testing-library/render-result-naming-convention */
