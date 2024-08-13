import { FormulaHelper as fh } from "../../support/helpers/formula-helper"

context("Formula Engine", () => {
  describe("Component Formula Tests", () => {
    it("Add and edit formula for a new attribute", () => {
      fh.visitURL("?sample=four&dashboard")
      fh.addNewAttribute()
      fh.renameAttribute("newAttr", "Formula")
      fh.addFormula("Formula", "a+1")
      fh.verifyValues("Formula", [2, 3, 4, 4, 1])
      fh.checkFormulaExists("Formula", "a+1")
      fh.editFormula("Formula", "a+2")
      fh.verifyValues("Formula", [3, 4, 5, 5, 2])
    })
    it("Add and edit formula for an existing attribute", () => {
      fh.visitURL("?sample=four&dashboard")
      fh.addFormula("b", "count(a)")
      fh.verifyValues("b", [4, 4, 4, 4, 4])
      fh.checkFormulaExists("b", "count(a)")
      fh.editFormula("b", "mean(a)")
      fh.verifyValues("b", [2.25, 2.25, 2.25, 2.25, 2.25])
    })
    it("Rename attribute and make sure formula updates", () => {
      fh.visitURL("?sample=four&dashboard")
      fh.addNewAttribute()
      fh.renameAttribute("newAttr", "Formula")
      fh.addFormula("Formula", "count(a)")
      fh.verifyValues("Formula", [4, 4, 4, 4, 4])
      fh.renameAttribute("a", "x")
      fh.checkFormulaExists("Formula", "count(x)")
      fh.verifyValues("Formula", [4, 4, 4, 4, 4])
      fh.editFormula("Formula", "mean(x)")
      fh.verifyValues("Formula", [2.25, 2.25, 2.25, 2.25, 2.25])
    })
    it("Delete attribute that a formula uses", () => {
      fh.visitURL("?sample=four&dashboard")
      fh.addFormula("b", "count(a)")
      fh.deleteAttribute("a")
      fh.checkFormulaExists("b", "count(a)")
      fh.verifyValues("b", [
        "❌ Undefined symbol a",
        "❌ Undefined symbol a",
        "❌ Undefined symbol a",
        "❌ Undefined symbol a",
        "❌ Undefined symbol a"
      ])
      fh.editFormula("b", "5")
      fh.verifyValues("b", [5, 5, 5, 5, 5])
    })
    it("Use slider variable with formula", () => {
      fh.visitURL("?sample=four&dashboard")
      fh.addFormula("b", "count(a) + v1")
      fh.verifyValues("b", [4.5, 4.5, 4.5, 4.5, 4.5])
      fh.changeSliderVariableName("v2")
      fh.checkFormulaExists("b", "count(a) + v2")
      fh.verifyValues("b", [4.5, 4.5, 4.5, 4.5, 4.5])
      fh.changeSliderValue("10")
      fh.verifyValues("b", [14, 14, 14, 14, 14])
      fh.deleteSlider()
      fh.checkFormulaExists("b", "count(a) + v2")
    })
    it("Add slider after using it in formula", () => {
      fh.visitURL("?sample=four")
      fh.addFormula("b", "count(a) + v1")
      fh.verifyValues("b", [
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1"
      ])
      fh.addSlider()
      fh.checkFormulaExists("b", "count(a) + v1")
      fh.verifyValues("b", [4.5, 4.5, 4.5, 4.5, 4.5])
      fh.deleteSlider()
      fh.verifyValues("b", [
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1"
      ])
    })
    it("Formula in a new dataset", () => {
      fh.visitURL("")
      fh.createNewDataset()
      fh.insertCases(2, 4)
      fh.addFormula("AttributeName", "10*10")
      fh.verifyValues("AttributeName", [100, 100, 100, 100, 100])
      fh.addNewAttribute()
      fh.addFormula("newAttr", "AttributeName+2")
      fh.verifyValues("newAttr", [102, 102, 102, 102, 102])
    })
  })
})
