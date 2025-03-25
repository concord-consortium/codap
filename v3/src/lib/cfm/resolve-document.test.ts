import { getExpectedContentType } from "./resolve-document"

describe("getExpectedContentType", () => {
  it("should return undefined for undefined inputs", () => {
    expect(getExpectedContentType()).toBeUndefined()
  })
  it("should return mime type if provided", () => {
    expect(getExpectedContentType("application/json")).toBe("application/json")
  })
  it("should return mime type based on extension", () => {
    expect(getExpectedContentType(undefined, "file:foo.csv")).toBe("application/csv")
  })
  it("should return undefined for file name without extension", () => {
    expect(getExpectedContentType(undefined, "file:foo")).toBeUndefined()
  })
})

describe("resolveDocument", () => {
  it("should work as expected", () => {
    expect(true).toBe(true) // TODO: add tests for resolveDocument
  })
})
