import { CANONICAL_NAME, isCanonicalName, rmCanonicalPrefix } from "./formula-types"

describe("isCanonicalName", () => {
  it("returns true if the name starts with the canonical name", () => {
    expect(isCanonicalName(`${CANONICAL_NAME}TEST`)).toBe(true)
  })
  it("returns false if the name does not start with the canonical name", () => {
    expect(isCanonicalName("FOO_BAR")).toBe(false)
  })
  it("returns false if the name is undefined or unexpected type", () => {
    expect(isCanonicalName(undefined)).toBe(false)
    expect(isCanonicalName(1)).toBe(false)
    expect(isCanonicalName({})).toBe(false)
    expect(isCanonicalName([])).toBe(false)
  })
})

describe("rmCanonicalPrefix", () => {
  it("removes the canonical prefix from the name", () => {
    expect(rmCanonicalPrefix(`${CANONICAL_NAME}TEST`)).toBe("TEST")
  })
  it("returns the original name if it does not start with the canonical name", () => {
    expect(rmCanonicalPrefix("FOO_BAR")).toBe("FOO_BAR")
  })
  it("returns the if the name is undefined or unexpected type", () => {
    expect(rmCanonicalPrefix(undefined)).toEqual(undefined)
    expect(rmCanonicalPrefix(1)).toEqual(1)
    expect(rmCanonicalPrefix({})).toEqual({})
    expect(rmCanonicalPrefix([])).toEqual([])
  })
})
