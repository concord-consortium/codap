import { FormulaHelper as fh } from "../../support/helpers/formula-helper"
import { TableTileElements as table } from "../../support/elements/table-tile"

context("Formula Engine", () => {
  describe("Errors Formula Tests", () => {
    it("Check invalid functions", () => {
      fh.visitURL("?sample=four&suppressUnsavedWarning=true")
      table.addNewAttribute()
      table.renameAttribute("newAttr", "Formula")
      table.addFormula("Formula", "count(aaa)")
      table.verifyFormulaValues("Formula", [
        "❌ Undefined symbol aaa",
        "❌ Undefined symbol aaa",
        "❌ Undefined symbol aaa",
        "❌ Undefined symbol aaa",
        "❌ Undefined symbol aaa"
      ])
      table.editFormula("Formula", "c(aaa)")
      table.verifyFormulaValues("Formula", [
        "❌ Undefined function c",
        "❌ Undefined function c",
        "❌ Undefined function c",
        "❌ Undefined function c",
        "❌ Undefined function c"
      ])
      // need to add {del} because CodeMirror auto-matches parentheses
      table.editFormula("Formula", "count(a{del}")
      table.verifyFormulaValues("Formula", [
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'",
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'",
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'",
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'",
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'"
      ])
      table.editFormula("Formula", "count(a)")
      table.verifyFormulaValues("Formula", [4, 4, 4, 4, 4])
    })
  })
})
