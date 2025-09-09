import { FormulaHelper as fh } from "../../support/helpers/formula-helper"
import { TableTileElements as table } from "../../support/elements/table-tile"
import { SliderTileElements as slider } from "../../support/elements/slider-tile"

context("Formula Engine", () => {
  const emptyUrlParams = "?suppressUnsavedWarning"
  const fourUrlParams = `${emptyUrlParams}&sample=four`
  const dashboardUrlParams = `${fourUrlParams}&dashboard`
  describe("Component Formula Tests", () => {
    it("Add and edit formula for a new attribute", () => {
      fh.visitURL(dashboardUrlParams)
      table.addNewAttribute()
      table.renameAttribute("newAttr", "Formula")
      table.addFormula("Formula", "a+1")
      table.verifyFormulaValues("Formula", [2, 3, 4, 4, ""])
      table.checkFormulaExists("Formula", "a+1")
      table.editFormula("Formula", "a+2")
      table.verifyFormulaValues("Formula", [3, 4, 5, 5, ""])
    })
    it("Add and edit formula for an existing attribute", () => {
      fh.visitURL(dashboardUrlParams)
      table.addFormula("b", "count(a)")
      table.verifyFormulaValues("b", [4, 4, 4, 4, 4])
      table.checkFormulaExists("b", "count(a)")
      table.editFormula("b", "mean(a)")
      table.verifyFormulaValues("b", [2.25, 2.25, 2.25, 2.25, 2.25])
    })
    it("Rename attribute and make sure formula updates", () => {
      fh.visitURL(dashboardUrlParams)
      table.addNewAttribute()
      table.renameAttribute("newAttr", "Formula")
      table.addFormula("Formula", "count(a)")
      table.verifyFormulaValues("Formula", [4, 4, 4, 4, 4])
      table.renameAttribute("a", "x")
      table.checkFormulaExists("Formula", "count(x)")
      table.verifyFormulaValues("Formula", [4, 4, 4, 4, 4])
      table.editFormula("Formula", "mean(x)")
      table.verifyFormulaValues("Formula", [2.25, 2.25, 2.25, 2.25, 2.25])
    })
    it("Delete attribute that a formula uses", () => {
      fh.visitURL(dashboardUrlParams)
      table.addFormula("b", "count(a)")
      table.deleteAttribute("a")
      table.checkFormulaExists("b", "count(a)")
      table.verifyFormulaValues("b", [
        "❌ Undefined symbol a",
        "❌ Undefined symbol a",
        "❌ Undefined symbol a",
        "❌ Undefined symbol a",
        "❌ Undefined symbol a"
      ])
      table.editFormula("b", "5")
      table.verifyFormulaValues("b", [5, 5, 5, 5, 5])
    })
    it("Use slider variable with formula", () => {
      fh.visitURL(dashboardUrlParams)
      table.addFormula("b", "count(a) + v1")
      table.verifyFormulaValues("b", [4.5, 4.5, 4.5, 4.5, 4.5])
      slider.changeVariableName("v2")
      table.checkFormulaExists("b", "count(a) + v2")
      table.verifyFormulaValues("b", [4.5, 4.5, 4.5, 4.5, 4.5])
      slider.changeVariableValue("10")
      table.verifyFormulaValues("b", [14, 14, 14, 14, 14])
      slider.deleteSlider()
      table.checkFormulaExists("b", "count(a) + v2")
    })
    it("Add slider after using it in formula", () => {
      fh.visitURL(fourUrlParams)
      table.addFormula("b", "count(a) + v1")
      table.verifyFormulaValues("b", [
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1"
      ])
      slider.addSlider()
      table.checkFormulaExists("b", "count(a) + v1")
      table.verifyFormulaValues("b", [4.5, 4.5, 4.5, 4.5, 4.5])
      slider.deleteSlider()
      table.verifyFormulaValues("b", [
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1"
      ])
    })
    // TODO: update test when insert cases on input row is implemnted
    it("Formula in a new dataset", () => {
      fh.visitURL(emptyUrlParams)
      cy.get("#user-entry-drop-overlay").type("{esc}")
      table.createNewTableFromToolShelf()
      table.getGridCell(2, 2).dblclick()
      table.getGridCell(2, 2).find("input").type("Sloth{enter}")
      table.openIndexMenuForRow(2)
      table.insertCases(4, "after")
      table.addFormula("Attribute Name", "10*10")
      table.verifyFormulaValues("Attribute Name", [100, 100, 100, 100, 100])
      table.addNewAttribute()
      table.addFormula("newAttr", "`Attribute Name`+2")
      table.verifyFormulaValues("newAttr", [102, 102, 102, 102, 102])
    })
  })
  describe("Add functions and values from Insert buttons", () => {
    it("Navigate functions browser", () => {
      const func = "abs"
      const funcCategory = "Arithmetic"
      fh.visitURL(dashboardUrlParams)
      table.addNewAttribute()
      table.renameAttribute("newAttr", "Formula")
      table.openAttributeMenu("Formula")
      table.selectMenuItemFromAttributeMenu("Edit Formula...")
      cy.get("[data-testid=formula-insert-function-button]").click()
      cy.get("[data-testid=formula-function-category-list]").should("be.visible")
      cy.get("[data-testid=formula-function-category-item]").contains(funcCategory).click()
      cy.get("[data-testid=formula-function-list]").should("be.visible")
      cy.get("[data-testid=formula-function-list-header]").should("contain", funcCategory)
      cy.get("[data-testid=function-menu-item]").contains(func).should("be.visible")
      cy.get(`[data-testid=function-info-button-${func}]`).click()
      cy.get("[data-testid=formula-function-info]").should("be.visible")
      cy.get("[data-testid=formula-function-info-header]").should("contain", func)
      cy.get("[data-testid=function-info-name]").should("contain", func)
      cy.get("[data-testid=formula-function-info-header]").click()
      cy.get("[data-testid=formula-function-list]").should("be.visible")
      cy.get("[data-testid=formula-function-list-header]").click()
      cy.get("[data-testid=formula-function-category-list]").should("be.visible")
    })
    it("Insert function into formula", () => {
      const func = "abs"
      const funcCategory = "Arithmetic"
      fh.visitURL(dashboardUrlParams)
      table.addNewAttribute()
      table.renameAttribute("newAttr", "Formula")
      table.openAttributeMenu("Formula")
      table.selectMenuItemFromAttributeMenu("Edit Formula...")
      cy.get("[data-testid=formula-insert-function-button]").click()
      cy.get("[data-testid=formula-function-category-list]").should("be.visible")
      cy.get("[data-testid=formula-function-category-item]").contains(funcCategory).click()
      cy.get("[data-testid=formula-function-list]").should("be.visible")
      cy.get("[data-testid=function-menu-item]").contains(func).should("be.visible")
      cy.get(`[data-testid=function-info-button-${func}]`).click()
      cy.get("[data-testid=formula-function-info]").should("be.visible")
      cy.get("[data-testid=function-info-name]").click()
      cy.get("[data-testid=formula-editor-input] .cm-content").should("have.text", `${func}(number)`)

    })
    it("Insert value into formula", () => {
      const value = "b"
      fh.visitURL(dashboardUrlParams)
      table.addNewAttribute()
      table.renameAttribute("newAttr", "Formula")
      table.openAttributeMenu("Formula")
      table.selectMenuItemFromAttributeMenu("Edit Formula...")
      cy.get("[data-testid=formula-insert-value-button]").click()
      cy.get("[data-testid=formula-value-list").should("be.visible")
      cy.get("[data-testid=formula-value-item").contains(value).should("be.visible")
      cy.get("[data-testid=formula-value-item").contains(value).click()
      cy.get("[data-testid=formula-editor-input] .cm-content").should("have.text", value)
    })
  })
})
