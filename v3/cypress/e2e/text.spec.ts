import { ComponentElements as c } from "../support/elements/component-elements"
import { kTextTileTestId, TextTileElements as t } from "../support/elements/text-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const textDefaultTitle = "Text"

context("Text tile", () => {
  beforeEach(function () {
      const queryParams = "?sample=mammals&dashboard&mouseSensor"
      const url = `${Cypress.config("index")}${queryParams}`
      cy.visit(url)
      cy.wait(1000) // Ensuring the page and components are fully loaded.
  })
  it("updates text title with undo/redo", () => {
    const newTextTileName = "My Text"
    c.getComponentTitle(kTextTileTestId).should("have.text", textDefaultTitle)
    c.changeComponentTitle(kTextTileTestId, newTextTileName)
    c.getComponentTitle(kTextTileTestId).should("have.text", newTextTileName)

    cy.log("Check update text title with undo/redo")
    // Undo title change
    toolbar.getUndoTool().click()
    c.getComponentTitle(kTextTileTestId).should("have.text", textDefaultTitle)

    // Redo title change
    toolbar.getRedoTool().click()
    c.getComponentTitle(kTextTileTestId).should("have.text", newTextTileName)
  })
  it("close text tile from close button with undo/redo", () => {
    c.closeComponent(kTextTileTestId)
    c.checkComponentDoesNotExist(kTextTileTestId)

    // Undo closing text tile (Reopen)
    toolbar.getUndoTool().click()
    c.checkComponentExists(kTextTileTestId)

    // Redo closing text tile
    toolbar.getRedoTool().click()
    c.checkComponentDoesNotExist(kTextTileTestId)
  })
  it("can type in text tile", () => {
    // focus the text tile
    t.getTextTileContent().click()
    const textToType = "This is some text."
    t.getTextTileContent().type(textToType)
    t.getTextTileContent().should("have.text", textToType)
    // blur the text tile
    cy.get(".codap-container").click()
    t.getTextTileContent().should("have.text", textToType)
    // Undo typing
    toolbar.getUndoTool().click()
    t.getTextTileContent().should("not.have.text", textToType)
    // Redo typing
    toolbar.getRedoTool().click()
    t.getTextTileContent().should("have.text", textToType)
  })
})
