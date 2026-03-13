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
      table.verifyFormulaValues("Formula", [2, 3, 4, 4])
      table.checkFormulaExists("Formula", "a+1")
      table.editFormula("Formula", "a+2")
      table.verifyFormulaValues("Formula", [3, 4, 5, 5])
    })
    it("Add and edit formula for an existing attribute", () => {
      fh.visitURL(dashboardUrlParams)
      table.addFormula("b", "count(a)")
      table.verifyFormulaValues("b", [4, 4, 4, 4])
      table.checkFormulaExists("b", "count(a)")
      table.editFormula("b", "mean(a)")
      table.verifyFormulaValues("b", [2.25, 2.25, 2.25, 2.25])
    })
    it("Rename attribute and make sure formula updates", () => {
      fh.visitURL(dashboardUrlParams)
      table.addNewAttribute()
      table.renameAttribute("newAttr", "Formula")
      table.addFormula("Formula", "count(a)")
      table.verifyFormulaValues("Formula", [4, 4, 4, 4])
      table.renameAttribute("a", "x")
      table.checkFormulaExists("Formula", "count(x)")
      table.verifyFormulaValues("Formula", [4, 4, 4, 4])
      table.editFormula("Formula", "mean(x)")
      table.verifyFormulaValues("Formula", [2.25, 2.25, 2.25, 2.25])
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
        "❌ Undefined symbol a"
      ])
      table.editFormula("b", "5")
      table.verifyFormulaValues("b", [5, 5, 5, 5])
    })
    it("Use slider variable with formula", () => {
      fh.visitURL(dashboardUrlParams)
      table.addFormula("b", "count(a) + v1")
      table.verifyFormulaValues("b", [4.5, 4.5, 4.5, 4.5])
      slider.changeVariableName("v2")
      table.checkFormulaExists("b", "count(a) + v2")
      table.verifyFormulaValues("b", [4.5, 4.5, 4.5, 4.5])
      slider.changeVariableValue("10")
      table.verifyFormulaValues("b", [14, 14, 14, 14])
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
        "❌ Undefined symbol v1"
      ])
      slider.addSlider()
      table.checkFormulaExists("b", "count(a) + v1")
      table.verifyFormulaValues("b", [4.5, 4.5, 4.5, 4.5])
      slider.deleteSlider()
      table.verifyFormulaValues("b", [
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1",
        "❌ Undefined symbol v1"
      ])
    })
    // TODO: update test when insert cases on input row is implemnted
    it("Formula in a new dataset", () => {
      fh.visitURL(emptyUrlParams)
      cy.get(".user-entry-modal-container").type("{esc}")
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
  describe("Keyboard navigation of formula editor menus", () => {
    beforeEach(() => {
      fh.visitURL(dashboardUrlParams)
      table.addNewAttribute()
      table.renameAttribute("newAttr", "Formula")
      table.openAttributeMenu("Formula")
      table.selectMenuItemFromAttributeMenu("Edit Formula...")
    })

    describe("Insert Value menu keyboard navigation", () => {
      it("Open menu via keyboard, navigate items, select with Enter", () => {
        // Tab out of formula editor to Insert Value button
        cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
        cy.realPress("Tab")
        cy.get("[data-testid=formula-insert-value-button]").should("have.focus")
        cy.realPress("Enter") // open menu by pressing Enter
        cy.get("[data-testid=formula-value-list]").should("be.visible")
        // First item should be focused
        cy.get("[data-testid=formula-value-item]").first().should("have.attr", "data-focused")
        // Navigate down with arrow key
        cy.realPress("ArrowDown")
        cy.get("[data-testid=formula-value-item]").eq(1).should("have.attr", "data-focused")
        // Navigate back up
        cy.realPress("ArrowUp")
        cy.get("[data-testid=formula-value-item]").first().should("have.attr", "data-focused")
        // Select the focused item with Enter — inserts "a" (first attribute in four dataset)
        cy.realPress("Enter")
        cy.get("[data-testid=formula-value-list]").should("not.exist")
        cy.get("[data-testid=formula-editor-input] .cm-content").should("have.text", "a")
      })
      it("Close menu with Escape, focus returns to button", () => {
        // Tab out of formula editor to Insert Value button
        cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
        cy.realPress("Tab")
        cy.get("[data-testid=formula-insert-value-button]").should("have.focus")
        cy.realPress("Enter") // open menu by pressing Enter
        cy.get("[data-testid=formula-value-list]").should("be.visible")
        cy.realPress("Escape")
        cy.get("[data-testid=formula-value-list]").should("not.exist")
        cy.get("[data-testid=formula-insert-value-button]").should("have.focus")
      })
    })

    describe("Insert Function menu keyboard navigation", () => {
      it("Open menu via keyboard, navigate categories, open a category with Enter", () => {
        // Tab from formula editor to Insert Value, then to Insert Function button
        cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
        cy.realPress("Tab")
        cy.realPress("Tab")
        cy.get("[data-testid=formula-insert-function-button]").should("have.focus")
        cy.realPress("Enter")
        cy.get("[data-testid=formula-function-category-list]").should("be.visible")
        // First category should be focused
        cy.get("[data-testid=formula-function-category-item]").first().should("have.attr", "data-focused")
        // Navigate down with arrow key
        cy.realPress("ArrowDown")
        cy.get("[data-testid=formula-function-category-item]").eq(1).should("have.attr", "data-focused")
        // Select category with Enter — opens the function list
        cy.realPress("Enter")
        cy.get("[data-testid=formula-function-list]").should("be.visible")
        cy.get("[data-testid=formula-function-list-header]").should("be.visible")
      })
      it("Navigate functions within a category and insert with Enter", () => {
        // Tab from formula editor to Insert Value, then to Insert Function button
        cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
        cy.realPress("Tab")
        cy.realPress("Tab")
        cy.get("[data-testid=formula-insert-function-button]").should("have.focus")
        // Open function menu and select first category (Arithmetic)
        cy.realPress("Enter")
        cy.get("[data-testid=formula-function-category-item]").first().should("have.attr", "data-focused")
        cy.realPress("Enter")
        cy.get("[data-testid=formula-function-list]").should("be.visible")
        // First function should be focused
        cy.get("[data-testid=function-menu-item]").first().should("have.attr", "data-focused")
        // Navigate down
        cy.realPress("ArrowDown")
        cy.get("[data-testid=function-menu-item]").eq(1).should("have.attr", "data-focused")
        // Navigate back up
        cy.realPress("ArrowUp")
        cy.get("[data-testid=function-menu-item]").first().should("have.attr", "data-focused")
        // Insert function with Enter
        cy.realPress("Enter")
        // Menu should close and function should be inserted
        cy.get("[data-testid=formula-function-list]").should("not.exist")
        cy.get("[data-testid=formula-editor-input] .cm-content").invoke("text").should("match", /\w+\(/)
      })
      it("Navigate back from list to categories with Escape", () => {
        // Tab from formula editor to Insert Value, then to Insert Function button
        cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
        cy.realPress("Tab")
        cy.realPress("Tab")
        cy.get("[data-testid=formula-insert-function-button]").should("have.focus")
        cy.realPress("Enter")
        cy.get("[data-testid=formula-function-category-item]").first().should("have.attr", "data-focused")
        cy.realPress("Enter")
        cy.get("[data-testid=formula-function-list]").should("be.visible")
        // Escape goes back to categories
        cy.realPress("Escape")
        cy.get("[data-testid=formula-function-category-list]").should("be.visible")
        // Escape again closes the menu entirely
        cy.realPress("Escape")
        cy.get("[data-testid=formula-function-category-list]").should("not.exist")
        cy.get("[data-testid=formula-insert-function-button]").should("have.focus")
      })
      it("Navigate to function info with Right Arrow and back with Left Arrow", () => {
        // Tab from formula editor to Insert Value, then to Insert Function button
        cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
        cy.realPress("Tab")
        cy.realPress("Tab")
        cy.get("[data-testid=formula-insert-function-button]").should("have.focus")
        cy.realPress("Enter")
        cy.get("[data-testid=formula-function-category-item]").first().should("have.attr", "data-focused")
        cy.realPress("Enter")
        cy.get("[data-testid=formula-function-list]").should("be.visible")
        // Right Arrow opens info for the focused function
        cy.realPress("ArrowRight")
        cy.get("[data-testid=formula-function-info]").should("be.visible")
        cy.get("[data-testid=function-info-name]").should("be.visible")
        // Left Arrow goes back to the function list
        cy.realPress("ArrowLeft")
        cy.get("[data-testid=formula-function-list]").should("be.visible")
        // Left Arrow again goes back to categories
        cy.realPress("ArrowLeft")
        cy.get("[data-testid=formula-function-category-list]").should("be.visible")
      })
    })

    describe("Modal-level keyboard navigation", () => {
      it("Tab order through modal elements", () => {
        // Focus starts in the formula editor input; Tab moves to Insert Value button
        cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
        cy.realPress("Tab")
        cy.get("[data-testid=formula-insert-value-button]").should("have.focus")
        // Tab to Insert Function menu button
        cy.realPress("Tab")
        cy.get("[data-testid=formula-insert-function-button]").should("have.focus")
        // Tab to Cancel button
        cy.realPress("Tab")
        cy.focused().should("contain.text", "Cancel")
        // Tab to Apply button
        cy.realPress("Tab")
        cy.focused().should("contain.text", "Apply")
        // Tab to attribute name input
        cy.realPress("Tab")
        cy.get("[data-testid=attr-name-input]").should("have.focus")
        // Tab to formula editor input
        cy.realPress("Tab")
        cy.get("[data-testid=formula-editor-input] .cm-content").should("have.focus")
      })
      it("Reverse Tab order through modal elements", () => {
        // Focus starts in the formula editor input.
        cy.get("[data-testid=formula-editor-input] .cm-content").should("have.focus")
        // Shift+Tab to attribute name input
        cy.realPress(["Shift", "Tab"])
        cy.get("[data-testid=attr-name-input]").should("have.focus")
        // Shift+Tab to Apply button
        cy.realPress(["Shift", "Tab"])
        cy.focused().should("contain.text", "Apply")
        // Shift+Tab to Cancel button
        cy.realPress(["Shift", "Tab"])
        cy.focused().should("contain.text", "Cancel")
        // Shift+Tab to Insert Function menu button
        cy.realPress(["Shift", "Tab"])
        cy.get("[data-testid=formula-insert-function-button]").should("have.focus")
        // Shift+Tab to Insert Value button
        cy.realPress(["Shift", "Tab"])
        cy.get("[data-testid=formula-insert-value-button]").should("have.focus")
        // Shift+Tab to formula editor input
        cy.realPress(["Shift", "Tab"])
        cy.get("[data-testid=formula-editor-input] .cm-content").should("have.focus")
      })
      it("Escape from modal closes it when no menus are open", () => {
        // Escape closes the modal regardless of whether focus is in the editor or elsewhere
        cy.get("[data-testid=formula-editor-input] .cm-content").should("have.focus")
        cy.realPress("Escape")
        cy.get(".formula-modal-body").should("not.exist")
      })
    })
  })
})
