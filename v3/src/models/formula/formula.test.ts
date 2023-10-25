import { Formula } from "./formula"

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
})
