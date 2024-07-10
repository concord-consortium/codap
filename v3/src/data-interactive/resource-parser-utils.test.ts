import { setupTestDataset } from "./handlers/handler-test-utils"
import { parseSearchQuery } from "./resource-parser-utils"

describe("DataInteractive ResourceParser Utilities", () => {
  it("parses search queries", () => {
    const { dataset, a1, a2 } = setupTestDataset()

    expect(parseSearchQuery("bad query", dataset).valid).toBe(false)

    const allResult = parseSearchQuery("*", dataset)
    expect(allResult.valid).toBe(true)

    const noAttrResult = parseSearchQuery("100==true", dataset)
    expect(noAttrResult.valid).toBe(false)
    expect(noAttrResult.left?.value).toBe(100)
    expect(noAttrResult.right?.value).toBe(true)

    const legalResult = parseSearchQuery("a1 < b", dataset)
    expect(legalResult.valid).toBe(true)
    expect(legalResult.left?.attr?.id).toBe(a1.id)
    expect(legalResult.right?.value).toBe("b")

    const legalResult2 = parseSearchQuery("   false!=          a2    ", dataset)
    expect(legalResult2.valid).toBe(true)
    expect(legalResult2.left?.value).toBe(false)
    expect(legalResult2.right?.attr?.id).toBe(a2.id)

    // The right operand can be blank
    const emptyResult = parseSearchQuery("a1==", dataset)
    expect(emptyResult.valid).toBe(true)
    expect(emptyResult.left?.attr?.id).toBe(a1.id)
    expect(emptyResult.right?.value).toBe("")
  })
})
