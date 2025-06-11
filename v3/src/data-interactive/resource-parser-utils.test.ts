import { setupTestDataset } from "../test/dataset-test-utils"
import { evaluateCaseFormula, parseSearchQuery } from "./resource-parser-utils"

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

  it("evaluates case formulas", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const c3 = dataset.collections[2]

    expect(evaluateCaseFormula("bad formula", dataset, c1).valid).toBe(false)

    const allResult = evaluateCaseFormula("true", dataset, c1)
    expect(allResult.valid).toBe(true)
    expect(allResult.caseIds?.length).toBe(2)
    expect(evaluateCaseFormula("true", dataset, c2).caseIds?.length).toBe(4)
    expect(evaluateCaseFormula("true", dataset, c3).caseIds?.length).toBe(6)

    expect(evaluateCaseFormula("a3 < 4", dataset, c3).caseIds?.length).toBe(3)
    expect(evaluateCaseFormula("a3 < 4", dataset, c2).caseIds?.length).toBe(3)
    expect(evaluateCaseFormula("a3 < 4", dataset, c1).caseIds?.length).toBe(2)

    expect(evaluateCaseFormula(`a3 < 4 and a1 != "b"`, dataset, c3).caseIds?.length).toBe(2)
    expect(evaluateCaseFormula(`a3 < 4 and a1 != "b"`, dataset, c2).caseIds?.length).toBe(2)
    expect(evaluateCaseFormula(`a3 < 4 and a1 != "b"`, dataset, c1).caseIds?.length).toBe(1)
  })
})
