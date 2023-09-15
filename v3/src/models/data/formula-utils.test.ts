import { safeSymbolName, customizeFormula } from "./formula-utils"

describe("safeSymbolName", () => {
  it("converts strings that are not parsable by Mathjs to valid symbol names", () => {
    expect(safeSymbolName("Valid_Name_Should_Not_Be_Changed")).toEqual("Valid_Name_Should_Not_Be_Changed")
    expect(safeSymbolName("Attribute Name")).toEqual("Attribute_Name")
    expect(safeSymbolName("1")).toEqual("_1")
    expect(safeSymbolName("1a")).toEqual("_1a")
    expect(safeSymbolName("Attribute 🙃 Test")).toEqual("Attribute____Test")
  })
})

describe("customizeFormula", () => {
  it("replaces all the assignment operators with equality operators", () => {
    expect(customizeFormula("a = 1")).toEqual("a == 1")
    expect(customizeFormula("a = b")).toEqual("a == b")
    expect(customizeFormula("a = b = c")).toEqual("a == b == c")
  })
  it("replaces all the symbols enclosed between `` with safe symbol names", () => {
    expect(customizeFormula("mean(`Attribute Name`)")).toEqual("mean(Attribute_Name)")
    expect(customizeFormula("`Attribute Name` + `Attribute Name 2`")).toEqual("Attribute_Name + Attribute_Name_2")
  })
})
