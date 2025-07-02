import { escapeBacktickString, unescapeBacktickString } from "./string-utils"

describe("unescapeBacktickString", () => {
  it("converts escaped characters in safe symbol name to original characters", () => {
    expect(unescapeBacktickString("Attribute\\`Test")).toEqual("Attribute`Test")
    expect(unescapeBacktickString("Attribute\\\\Test")).toEqual("Attribute\\Test")
  })
  it("is's an inverse of escapeBacktickString", () => {
    const testString = "Attribute\\\\\\`Test"
    expect(unescapeBacktickString(escapeBacktickString(testString))).toEqual(testString)
  })
})

describe("escapeBacktickString", () => {
  it("converts some characters in safe symbol name to escaped characters", () => {
    expect(escapeBacktickString("Attribute`Test")).toEqual("Attribute\\`Test")
    expect(escapeBacktickString("Attribute\\Test")).toEqual("Attribute\\\\Test")
  })
  it("is's an inverse of unescapeBacktickString", () => {
    const testString = "Attribute`Test\\"
    expect(unescapeBacktickString(escapeBacktickString(testString))).toEqual(testString)
  })
})
