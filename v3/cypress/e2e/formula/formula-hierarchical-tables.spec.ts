import { FormulaHelper as fh } from "../../support/helpers/formula-helper"
import { TableTileElements as table } from "../../support/elements/table-tile"

context("Formula Engine", () => {
  const urlParams = "?suppressUnsavedWarning"
  describe("Hierarchical Case Tables Formula Tests", () => {
    it("Check aggregate and non-aggregate formulae referencing a parent attribute in child collection", () => {
      fh.visitURL(urlParams)
      fh.importFile("cypress/fixtures/hierarchical-four.codap3")
      table.addNewAttribute(2)
      table.renameAttribute("newAttr", "Formula", 2)
      table.addFormula("Formula", "count(b)", 2)
      table.verifyFormulaValues("Formula", [
        "❌ invalid reference to parent attribute 'b' within aggregate function",
        "❌ invalid reference to parent attribute 'b' within aggregate function",
        "❌ invalid reference to parent attribute 'b' within aggregate function",
        "❌ invalid reference to parent attribute 'b' within aggregate function",
        "❌ invalid reference to parent attribute 'b' within aggregate function"
      ], 2)
      table.editFormula("Formula", "b+1", 2)
      table.verifyFormulaValues("Formula", [2, 2, 2, "", ""], 2)
    })
    it("Check aggregate and non-aggregate formulae referencing a child attribute in child collection", () => {
      fh.visitURL(urlParams)
      fh.importFile("cypress/fixtures/hierarchical-four.codap3")
      table.addNewAttribute(2)
      table.renameAttribute("newAttr", "Formula", 2)
      table.addFormula("Formula", "count(a)", 2)
      table.verifyFormulaValues("Formula", [3, 3, 3, 1, 1], 2)
      table.editFormula("Formula", "a+1", 2)
      table.verifyFormulaValues("Formula", [2, 3, 4, 4, ""], 2)
    })
    it("Check aggregate and non-aggregate formulae referencing a parent attribute in parent collection", () => {
      fh.visitURL(urlParams)
      fh.importFile("cypress/fixtures/hierarchical-four.codap3")
      table.addNewAttribute(1)
      table.renameAttribute("newAttr", "Formula", 1)
      table.addFormula("Formula", "count(b)", 1)
      table.verifyFormulaValues("Formula", [1, 1], 1)
      table.editFormula("Formula", "b+1", 1)
      table.verifyFormulaValues("Formula", [2, ""], 1)
    })
    it("Check aggregate and non-aggregate formulae referencing a child attribute in parent collection", () => {
      fh.visitURL(urlParams)
      fh.importFile("cypress/fixtures/hierarchical-four.codap3")
      table.addNewAttribute(1)
      table.renameAttribute("newAttr", "Formula", 1)
      table.addFormula("Formula", "a+1", 1)
      table.verifyFormulaValues("Formula", [
        "❌ invalid reference to child attribute 'a'",
        "❌ invalid reference to child attribute 'a'"
      ], 1)
      table.editFormula("Formula", "count(a)", 1)
      table.verifyFormulaValues("Formula", [3, 1], 1)
    })
  })
})
