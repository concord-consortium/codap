import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const textDefaultTitle = "Text"
const kTextTileClass = "codap-text"

context("Text tile", () => {
  beforeEach(function () {
      const queryParams = "?sample=mammals&dashboard&mouseSensor"
      const url = `${Cypress.config("index")}${queryParams}`
      cy.visit(url)
      cy.wait(1000) // Ensuring the page and components are fully loaded.
  })
  it("updates text title with undo/redo", () => {
    const newTextTileName = "My Text"
    c.getComponentTitle(kTextTileClass).should("have.text", textDefaultTitle)
    c.changeComponentTitle(kTextTileClass, newTextTileName)
    c.getComponentTitle(kTextTileClass).should("have.text", newTextTileName)

    cy.log("Check update text title with undo/redo")
    // Undo title change
    toolbar.getUndoTool().click()
    c.getComponentTitle(kTextTileClass).should("have.text", textDefaultTitle)

    // Redo title change
    toolbar.getRedoTool().click()
    c.getComponentTitle(kTextTileClass).should("have.text", newTextTileName)
  })
  it("close text tile from close button with undo/redo", () => {
    c.closeComponent(kTextTileClass)
    c.checkComponentDoesNotExist(kTextTileClass)

    // Undo closing text tile (Reopen)
    toolbar.getUndoTool().click()
    c.checkComponentExists(kTextTileClass)

    // Redo closing text tile
    toolbar.getRedoTool().click()
    c.checkComponentDoesNotExist(kTextTileClass)
  })
  it("can type in text tile", () => {
    // focus the text tile
    cy.get(".codap-text-content").click()
    const textToType = "This is some text."
    cy.get(".codap-text-content").type(textToType)
    cy.get(".codap-text-content").should("have.text", textToType)
    // blur the text tile
    cy.get(".codap-container").click()
    cy.get(".codap-text-content").should("have.text", textToType)
    // Undo typing
    toolbar.getUndoTool().click()
    cy.get(".codap-text-content").should("not.have.text", textToType)
    // Redo typing
    toolbar.getRedoTool().click()
    cy.get(".codap-text-content").should("have.text", textToType)
  })
})
