import { FormulaHelper as fh } from "../../support/helpers/formula-helper"

context("Formula Engine", () => {
  describe("Errors Formula Tests", () => {
    it("Check invalid functions", () => {
      fh.visitURL("?sample=four")
      fh.addNewAttribute()
      fh.renameAttribute("newAttr", "Formula")
      fh.addFormula("Formula", "count(aaa)")
      fh.verifyValues("Formula", [
        "❌ Undefined symbol aaa",
        "❌ Undefined symbol aaa",
        "❌ Undefined symbol aaa",
        "❌ Undefined symbol aaa",
        "❌ Undefined symbol aaa"
      ])
      fh.editFormula("Formula", "c(aaa)")
      fh.verifyValues("Formula", [
        "❌ Undefined function c",
        "❌ Undefined function c",
        "❌ Undefined function c",
        "❌ Undefined function c",
        "❌ Undefined function c"
      ])
      // need to add {del} because CodeMirror auto-matches parentheses
      fh.editFormula("Formula", "count(a{del}")
      fh.verifyValues("Formula", [
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'",
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'",
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'",
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'",
        "❌ Syntax error: 'Parenthesis ) expected (char 8)'"
      ])
      fh.editFormula("Formula", "count(a)")
      fh.verifyValues("Formula", [4, 4, 4, 4, 4])
    })
  })
})
