import { TableTileElements as table } from "../support/elements/table-tile"

// Regression tests for CODAP-572: focus should return to the attribute MenuButton
// after closing inline rename, Edit Formula dialog, and Edit Attribute Properties dialog.
context("Attribute focus restore", () => {
  beforeEach(() => {
    const queryParams = "?sample=mammals&scrollBehavior=auto&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  })

  it("restores focus to attribute button after cancelling inline rename", () => {
    table.openAttributeMenu("Height")
    table.selectMenuItemFromAttributeMenu("Rename")
    cy.get("[data-testid=column-name-input]").should("be.visible")
    cy.get("[data-testid=column-name-input]").type("{esc}")
    // Focus should be on the original attribute's MenuButton
    cy.focused().should("have.attr", "data-testid", "codap-attribute-button Height")
    // The RDG cell should show its selection outline
    cy.focused().closest(".rdg-cell").should("have.attr", "aria-selected", "true")
  })

  it("restores focus to attribute button after accepting inline rename", () => {
    table.openAttributeMenu("Height")
    table.selectMenuItemFromAttributeMenu("Rename")
    table.renameColumnName("{selectAll}Tallness{enter}")
    // Focus should be on the renamed attribute's MenuButton
    cy.focused().should("have.attr", "data-testid", "codap-attribute-button Tallness")
    // The RDG cell should show its selection outline
    cy.focused().closest(".rdg-cell").should("have.attr", "aria-selected", "true")
    // The attribute menu should NOT be open
    cy.get("[data-testid=attribute-menu-list]").should("not.be.visible")
  })

  it("restores focus to attribute button after Edit Attribute Properties", () => {
    table.openAttributeMenu("Height")
    table.selectMenuItemFromAttributeMenu("Edit Attribute Properties...")
    // Dialog should be open
    cy.get("[data-testid=attr-name-input]").should("be.visible")
    table.getCancelButton().click()
    // Focus should return to the attribute's MenuButton
    cy.focused().should("have.attr", "data-testid", "codap-attribute-button Height")
  })

  it("restores focus to attribute button after Edit Formula", () => {
    table.openAttributeMenu("Height")
    table.selectMenuItemFromAttributeMenu("Edit Formula...")
    // Formula editor should be open
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible")
    cy.get("[data-testid=Cancel-button]").click()
    // Focus should return to the attribute's MenuButton
    cy.focused().should("have.attr", "data-testid", "codap-attribute-button Height")
  })

  it("can open attribute menu after adding a new attribute without a name", () => {
    table.addNewAttribute()
    table.openAttributeMenu("newAttr")
    cy.get("[data-testid=attribute-menu-list]").should("be.visible")
    table.getAttributeMenuItem("Rename").should("be.visible")
  })
})
