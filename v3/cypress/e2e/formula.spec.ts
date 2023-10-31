import { FormulaHelper as fh } from "../support/helpers/formula-helper"
import formula from '../fixtures/formula.json'

context("Formula Engine", () => {
  describe("Component Formula Tests", () => {
    formula.componentTests.forEach(f => {
      it(`${f.testName}`, () => {
        f.steps.forEach(s => {
          fh.stepExecutor(s)
        })
      })
    })
  })
  describe("Hierarchical Formula Tests", () => {
    formula.hierarchicalTests.forEach(f => {
      it(`${f.testName}`, () => {
        f.steps.forEach(s => {
          fh.stepExecutor(s)
        })
      })
    })
  })
  describe("Errors Tests", () => {
    formula.errorTests.forEach(f => {
      it(`${f.testName}`, () => {
        f.steps.forEach(s => {
          fh.stepExecutor(s)
        })
      })
    })
  })
  describe("Special Character Tests", () => {
    formula.specialCharacterTests.forEach(f => {
      it(`${f.testName}`, () => {
        f.steps.forEach(s => {
          fh.stepExecutor(s)
        })
      })
    })
  })
})
