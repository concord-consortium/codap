import { canonicalizeAttributeName } from "./data-interactive-utils"

describe("Canonicalize Attribute Name", () => {
  test("canonicalizeAttributeName works properly", () => {
    expect(canonicalizeAttributeName("")).toEqual("attr")
    expect(canonicalizeAttributeName(" fake attr(ms) ")).toEqual("fake_attr")
  })
})
