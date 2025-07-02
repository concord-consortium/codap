import { Formula, IFormulaSnapshot } from "./formula"
import { FormulaManager } from "./formula-manager"

jest.mock("./utils/misc", () => ({
  isRandomFunctionPresent: (fn: string) => fn.includes("random")
}))

function createFormula(snapshot?: IFormulaSnapshot) {
  const formulaManager = new FormulaManager()
  return Formula.create(snapshot, {formulaManager})
}

describe("Formula", () => {
  it("should have an empty display by default", () => {
    const formula = createFormula()
    expect(formula.display).toBe("")
  })

  it("should be valid when display is set to a valid expression", () => {
    const formula = createFormula({ display: "2 + 3 * 4" })
    expect(formula.valid).toBe(true)
    expect(formula.syntaxError).toBeNull()
  })

  it("should be invalid when display is set to an invalid expression", () => {
    const formula = createFormula({ display: "2 + * 3" })
    expect(formula.valid).toBe(false)
    expect(formula.syntaxError).toBeDefined()
  })

  it("setDisplayExpression should change the formula", () => {
    const formula = createFormula({ display: "1 + 2" })
    formula.setDisplayExpression("1 + 2 + 3")
    expect(formula.valid).toBe(true)
    expect(formula.display).toBe("1 + 2 + 3")
  })

  it("setCanonicalExpression should change the canonical formula", () => {
    const formula = createFormula({ display: "1 + 2" })
    expect(formula.valid).toBe(true)
    expect(formula.display).toBe("1 + 2")
    expect(formula.canonical).toBe("")
    formula.setCanonicalExpression("1 + 2")
    expect(formula.valid).toBe(true)
    expect(formula.canonical).toBe("1 + 2")
  })

  it("can check whether a formula contains a random function", () => {
    const formula = createFormula({ display: "1 + 2" })
    formula.setCanonicalExpression("1 + 2")
    expect(formula.isRandomFunctionPresent).toBe(false)
    const randomFormula = createFormula({ display: "random()" })
    randomFormula.setCanonicalExpression("random()")
    expect(randomFormula.isRandomFunctionPresent).toBe(true)
  })

  it("rerandomize calls recalculateFormula on formulaManager", () => {
    const formulaManager = new FormulaManager()
    const recalculateFormulaSpy = jest.spyOn(formulaManager, "recalculateFormula")
    // override recalculateFormula so we don't have to bother with registering the formula
    recalculateFormulaSpy.mockImplementation(() => undefined)
    const formula = Formula.create({ display: "1 + 2" }, {formulaManager})
    formula.rerandomize()
    expect(recalculateFormulaSpy).toHaveBeenCalledTimes(1)
    jest.resetAllMocks()
  })
})
