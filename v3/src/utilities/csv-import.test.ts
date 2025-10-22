import { CsvParseResult, convertParsedCsvToDataSet } from "./csv-import"

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
})
