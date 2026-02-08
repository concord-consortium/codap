import { CsvParseResult, convertParsedCsvToDataSet, importCsvContent } from "./csv-import"

describe("CSV import", () => {
  it("works as expected", () => {
    const result: CsvParseResult = {
      data: [
        { "a1": "c1a1", "a2": "c1a2", "a3": "c1a3" },
        { "a1": "c2a1", "a2": "c2a2", "a3": "c2a3" },
        { "a1": "c3a1", "a2": "c3a2", "a3": "c3a3" }
      ],
      errors: [],
      meta: {
        delimiter: ",",
        linebreak: "\n",
        aborted: false,
        truncated: false,
        cursor: 0
      }
    }
    const data = convertParsedCsvToDataSet(result, "Test")
    expect(data.attributes.length).toBe(3)
    expect(data.items.length).toBe(3)
  })

  it("handles CSV with comment lines and spaces in headers", (done) => {
    const csv = [
      "# comment line 1",
      "# field_unit: UTC, Counts",
      "Time, Sample",
      "2025-09-22T09:55:38.019Z, -2932",
      "2025-09-22T09:55:38.044Z, -3009"
    ].join("\n")

    importCsvContent(csv, (results) => {
      const data = convertParsedCsvToDataSet(results, "test-data.csv")
      expect(data.name).toBe("test-data")
      expect(data.attributes.length).toBe(2)
      expect(data.attributes[0].name).toBe("Time")
      expect(data.attributes[1].name).toBe("Sample")
      expect(data.items.length).toBe(2)
      expect(data.getValueAtItemIndex(0, data.attributes[0].id)).toBe("2025-09-22T09:55:38.019Z")
      expect(data.getValueAtItemIndex(0, data.attributes[1].id)).toBe(-2932)
      expect(data.getValueAtItemIndex(1, data.attributes[0].id)).toBe("2025-09-22T09:55:38.044Z")
      expect(data.getValueAtItemIndex(1, data.attributes[1].id)).toBe(-3009)
      done()
    })
  })

  it("handles CSV with empty lines", (done) => {
    const csv = "a, b\n1, 2\n\n3, 4\n"

    importCsvContent(csv, (results) => {
      const data = convertParsedCsvToDataSet(results, "test")
      expect(data.attributes.length).toBe(2)
      expect(data.attributes[0].name).toBe("a")
      expect(data.attributes[1].name).toBe("b")
      expect(data.items.length).toBe(2)
      done()
    })
  })
})
