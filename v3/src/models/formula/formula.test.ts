import { getSnapshot } from "mobx-state-tree"
import { Formula, OriginalFormula } from "./formula"

jest.mock("./utils/misc", () => ({
  isRandomFunctionPresent: (fn: string) => fn.includes("random")
}))

describe("Formula", () => {
  it("should be empty by default", () => {
    const formula = Formula.create()
    expect(formula.display).toBe("")
    expect(formula._canonical).toBe("")
    expect(formula.canonical).toBe("")
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

  it("can process legacy formula snapshots", () => {
    const old = OriginalFormula.create({ display: "1 + 2", canonical: "1 + 2" })
    const f = Formula.create(getSnapshot(old))
    expect(f.display).toBe("1 + 2")
    expect(f._canonical).toBe("1 + 2")
    expect(f.canonical).toBe("1 + 2")
  })

  it("copies volatile canonical property to serialized _canonical property in prepareSnapshot", () => {
    const f = Formula.create({ display: "1 + 2", _canonical: "1 + 2" })
    expect(f.display).toBe("1 + 2")
    expect(f._canonical).toBe("1 + 2")
    expect(f.canonical).toBe("1 + 2")
    f.setDisplayExpression("π")
    f.setCanonicalExpression("π")
    expect(f.display).toBe("π")
    // serialized property not updated
    expect(f._canonical).toBe("1 + 2")
    expect(f.canonical).toBe("π")
    f.prepareSnapshot()
    expect(f.display).toBe("π")
    // serialized property updated
    expect(f._canonical).toBe("π")
    expect(f.canonical).toBe("π")
  })
})
