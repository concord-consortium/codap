import { FormulaHelper as fh } from "../../support/helpers/formula-helper"

context("Formula Engine", () => {
  describe("Hierarchical Case Tables Formula Tests", () => {
    it("Check aggregate and non-aggregate formulae referencing a parent attribute in child collection", () => {
      fh.visitURL("")
      fh.importFile("cypress/fixtures/hierarchical-four.codap3")
      fh.addNewAttribute(2)
      fh.renameAttribute("newAttr", "Formula", 2)
      fh.addFormula("Formula", "count(b)", 2)
      fh.verifyValues("Formula", [
        "❌ invalid reference to parent attribute 'b' within aggregate function",
        "❌ invalid reference to parent attribute 'b' within aggregate function",
        "❌ invalid reference to parent attribute 'b' within aggregate function",
        "❌ invalid reference to parent attribute 'b' within aggregate function",
        "❌ invalid reference to parent attribute 'b' within aggregate function"
      ], 2)
      fh.editFormula("Formula", "b+1", 2)
      fh.verifyValues("Formula", [2, 2, 2, 1, 1], 2)
    })
    it("Check aggregate and non-aggregate formulae referencing a child attribute in child collection", () => {
      fh.visitURL("")
      fh.importFile("cypress/fixtures/hierarchical-four.codap3")
      fh.addNewAttribute(2)
      fh.renameAttribute("newAttr", "Formula", 2)
      fh.addFormula("Formula", "count(a)", 2)
      fh.verifyValues("Formula", [3, 3, 3, 1, 1], 2)
      fh.editFormula("Formula", "a+1", 2)
      fh.verifyValues("Formula", [2, 3, 4, 4, 1], 2)
    })
    it("Check aggregate and non-aggregate formulae referencing a parent attribute in parent collection", () => {
      fh.visitURL("")
      fh.importFile("cypress/fixtures/hierarchical-four.codap3")
      fh.addNewAttribute(1)
      fh.renameAttribute("newAttr", "Formula", 1)
      fh.addFormula("Formula", "count(b)", 1)
      fh.verifyValues("Formula", [1, 1], 1)
      fh.editFormula("Formula", "b+1", 1)
      fh.verifyValues("Formula", [2, 1], 1)
    })
    it("Check aggregate and non-aggregate formulae referencing a child attribute in parent collection", () => {
      fh.visitURL("")
      fh.importFile("cypress/fixtures/hierarchical-four.codap3")
      fh.addNewAttribute(1)
      fh.renameAttribute("newAttr", "Formula", 1)
      fh.addFormula("Formula", "a+1", 1)
      fh.verifyValues("Formula", [
        "❌ invalid reference to child attribute 'a'",
        "❌ invalid reference to child attribute 'a'"
      ], 1)
      fh.editFormula("Formula", "count(a)", 1)
      fh.verifyValues("Formula", [3, 1], 1)
    })
  })
})
