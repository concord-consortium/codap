import { Formula } from "./formula"

jest.mock("./utils/misc", () => ({
  isRandomFunctionPresent: (fn: string) => fn.includes("random")
}))

describe("Formula", () => {
  it("should have an empty display by default", () => {
    const formula = Formula.create()
    expect(formula.display).toBe("")
  })

  it("should be valid when display is set to a valid expression", () => {
    const formula = Formula.create({ display: "2 + 3 * 4" })
    expect(formula.valid).toBe(true)
    expect(formula.syntaxError).toBeNull()
  })

  it("should be invalid when display is set to an invalid expression", () => {
    const formula = Formula.create({ display: "2 + * 3" })
    expect(formula.valid).toBe(false)
    expect(formula.syntaxError).toBeDefined()
  })

  it("setDisplayExpression should change the formula", () => {
    const formula = Formula.create({ display: "1 + 2" })
    formula.setDisplayExpression("1 + 2 + 3")
    expect(formula.valid).toBe(true)
    expect(formula.display).toBe("1 + 2 + 3")
  })

  it("setCanonicalExpression should change the canonical formula", () => {
    const formula = Formula.create({ display: "1 + 2" })
    expect(formula.valid).toBe(true)
    expect(formula.display).toBe("1 + 2")
    expect(formula.canonical).toBe("")
    formula.setCanonicalExpression("1 + 2")
    expect(formula.valid).toBe(true)
    expect(formula.canonical).toBe("1 + 2")
  })

  it("can check whether a formula contains a random function", () => {
    const formula = Formula.create({ display: "1 + 2" })
    formula.setCanonicalExpression("1 + 2")
    expect(formula.isRandomFunctionPresent).toBe(false)
    const randomFormula = Formula.create({ display: "random()" })
    randomFormula.setCanonicalExpression("random()")
    expect(randomFormula.isRandomFunctionPresent).toBe(true)
  })

  it("rerandomize calls recalculateFormula on formulaManager", () => {
    const badEnv = { formulaManager: undefined }
    const formula = Formula.create({ display: "1 + 2" }, badEnv)
    formula.rerandomize()

    const env = {
      formulaManager: {
        recalculateFormula: jest.fn()
      }
    }
    const formulaWithEnv = Formula.create({ display: "1 + 2" }, env)
    formulaWithEnv.rerandomize()
    expect(env.formulaManager.recalculateFormula).toHaveBeenCalledTimes(1)
  })
})
