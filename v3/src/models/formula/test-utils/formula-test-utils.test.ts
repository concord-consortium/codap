import { evaluate, evaluateForAllCases, getFormulaTestEnv } from "./formula-test-utils"

describe("getFormulaTestEnv", () => {
  it("returns default environment with datasets and global values", () => {
    const formulaTestEnv = getFormulaTestEnv()
    const Mammals = formulaTestEnv.dataSetsByName.Mammals
    const Cats = formulaTestEnv.dataSetsByName.Cats
    expect(Mammals.name).toEqual("Mammals")
    expect(Cats.name).toEqual("Cats")
    expect(formulaTestEnv.dataSets?.get(Mammals.id)).toEqual(Mammals)
    expect(formulaTestEnv.dataSets?.get(Cats.id)).toEqual(Cats)
    expect(formulaTestEnv.globalValueManager?.getValueByName("v1")?.value).toEqual(0.5)
    expect(formulaTestEnv.globalValueManager?.getValueByName("v2")?.value).toEqual(2)
  })
})

describe("evaluate", () => {
  it("evaluates basic formulas correctly", () => {
    expect(evaluate("1 + 2")).toEqual(3)
  })

  it("can evaluate case-dependant formulas when case pointer is provided", () => {
    expect(evaluate("LifeSpan", 0)).toEqual(70)
    expect(evaluate("LifeSpan", 10)).toEqual(30)
    expect(evaluate("LifeSpan", 26)).toEqual(25)
  })

  it("evaluates formulas with global values", () => {
    expect(evaluate("v1")).toEqual(0.5)
    expect(evaluate("v2")).toEqual(2)
  })

  it("sets Mammals dataset as a local dataset", () => {
    expect(evaluate("LifeSpan", 0)).toEqual(70)
    // TailLength is an attribute from Cats dataset.
    expect(() => evaluate("TailLength", 0)).toThrow("Undefined symbol TailLength")
  })

  it("throws an error when user is trying to evaluate case-dependant formula without providing casePointer", () => {
    expect(() => evaluate("LifeSpan")).toThrow()
  })
})

describe("evaluateForAllCases", () => {
  it("evaluates basic formulas correctly", () => {
    const result = new Array(27).fill(3)
    expect(evaluateForAllCases("1 + 2")).toEqual(result)
  })

  it("can evaluate case-dependant formulas", () => {
    expect(evaluateForAllCases("LifeSpan")).toEqual([
      70, 70, 19, 25, 14, 40, 16, 40, 25, 16, 30, 9, 25, 3, 80, 20, 50, 15, 5,
      10, 12, 20, 10, 10, 5, 7, 25
    ])
  })
})
