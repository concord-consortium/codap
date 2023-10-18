import { FormulaHelper as fh } from "../support/helpers/formula-helper"
import formula from '../fixtures/arithmetic-formula.json'

context("Formula Engine", () => {
  describe("Function Tests", () => {
    formula.functionTests.forEach(f => {
      it(`${f.testName}`, () => {
        f.steps.forEach(s => {
          fh.stepExecutor(s)
        })
      })
    })
  })
})
