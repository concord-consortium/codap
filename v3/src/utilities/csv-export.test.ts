import { setupTestDataset } from "../test/dataset-test-utils"
import { escapeCsvValue, convertDatasetToCsv } from "./csv-export"

describe("escapeCsvValue", () => {
  it("should escape double quotes", () => {
    expect(escapeCsvValue('He said "Hello"')).toBe('"He said ""Hello"""')
  })

  it("should wrap value in quotes if it contains a comma", () => {
    expect(escapeCsvValue("a,b")).toBe('"a,b"')
  })

  it("should wrap value in quotes if it contains a newline", () => {
    expect(escapeCsvValue("a\nb")).toBe('"a\nb"')
  })

  it("should not wrap value if it contains no special characters", () => {
    expect(escapeCsvValue("abc")).toBe("abc")
  })

  it("should escape and wrap if value contains both comma and quotes", () => {
    expect(escapeCsvValue('a,"b"')).toBe('"a,""b"""')
  })
})

describe("convertDatasetToCsv", () => {
  it("should export CSV with attribute headers and data", () => {
    const { dataset } = setupTestDataset()
    const csv = convertDatasetToCsv(dataset)
    expect(csv).toContain("# name: data")
    expect(csv).toContain("# attribute -- name: a1, type: categorical, editable: true")
    expect(csv).toContain("# attribute -- name: a2, type: categorical, editable: true")
    expect(csv).toContain("# attribute -- name: a3, type: numeric, editable: true")
    expect(csv).toContain("# attribute -- name: a4, type: numeric, editable: true")
    expect(csv).toMatch(/a1,a2,a3,a4\na,x,1,-1\nb,y,2,-2\na,z,3,-3\nb,z,4,-4\na,x,5,-5\nb,y,6,-6/)
  })

  it("should use parent collection attributes if provided", () => {
    const { dataset, c1 } = setupTestDataset()
    const csv = convertDatasetToCsv(dataset, c1)
    expect(csv).toContain("# name: data")
    expect(csv).toContain("# attribute -- name: a1, type: categorical, editable: true")
    expect(csv).not.toContain("# attribute -- name: a2, type: categorical, editable: true")
    expect(csv).not.toContain("# attribute -- name: a3, type: numeric, editable: true")
    expect(csv).not.toContain("# attribute -- name: a4, type: numeric, editable: true")
    expect(csv).toMatch(/a1\na\nb/)
    expect(csv).not.toMatch(/a1\na\nb\na\nb\na\nb/)
  })

  it("should use child collection attributes if provided", () => {
    const { dataset } = setupTestDataset()
    const csv = convertDatasetToCsv(dataset, dataset.childCollection)
    expect(csv).toContain("# name: data")
    expect(csv).not.toContain("# attribute -- name: a1, type: categorical, editable: true")
    expect(csv).not.toContain("# attribute -- name: a2, type: categorical, editable: true")
    expect(csv).toContain("# attribute -- name: a3, type: numeric, editable: true")
    expect(csv).toContain("# attribute -- name: a4, type: numeric, editable: true")
    expect(csv).toMatch(/a3,a4\n1,-1\n5,-5\n3,-3\n2,-2\n6,-6\n4,-4/)
  })

  it("should escape commas in attribute names", () => {
    const { dataset, a1 } = setupTestDataset()
    a1.setName("a,1")
    const csv = convertDatasetToCsv(dataset)
    expect(csv).toContain("# attribute -- name: a&comma;1, type: categorical, editable: true")
  })

  it("should include attribute description and units if present", () => {
    const { dataset, a1 } = setupTestDataset()
    a1.setDescription("an attribute")
    a1.setUnits("kg")
    const csv = convertDatasetToCsv(dataset)
    expect(csv).toContain("# attribute -- name: a1, description: an attribute, type: categorical, unit: kg")
  })
})
