import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

let arrayOfAttributes: string[]
let arrayOfValues: Array<{attribute: string, values: string[]}>

context("Test graph axes with various attribute types", () => {
  beforeEach(() => {
    cy.fixture('axis-test-data.json').then((data) => {
      arrayOfAttributes = data.attributes
      arrayOfValues = data.values
    })
    const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  })
  it("will show default x axis label", () => {
    ah.verifyDefaultAxisLabel("bottom")
    ah.verifyDefaultAxisLabel("left")
  })
  it("will add categorical attribute to x axis with undo/redo", () => {
    // Adding the attribute
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Habitat", "bottom") // Habitat => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")

    // Undo adding the attribute
    cy.log("test undo/redo of add categorical attribute to x axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    // Verify the attribute was removed
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")

    // Redo adding the attribute
    toolbar.getRedoTool().click()
    // Verify the attribute was removed
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
  })
  it("will add numeric attribute to x axis with undo/redo", () => {
    // Adding the attribute
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("LifeSpan", "bottom") // LifeSpan => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[2].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")

    // Undo adding the attribute
    cy.log("test undo/redo of add numeric attribute to x axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    // Verify the attribute was added back
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")

    // Redo adding the attribute
    toolbar.getRedoTool().click()
    // Verify the attribute was removed
    ah.verifyAxisTickLabels("bottom", arrayOfValues[2].values)
  })
  it("will add categorical attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[8], "left") // Diet => y-axis
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)

    cy.log("test undo/redo of add categorical attribute to y axis")
    toolbar.getUndoTool().click()
    ah.verifyDefaultAxisLabel("left")

    toolbar.getRedoTool().click()
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)

    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")
  })
  it("will add numeric attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[5], "left") // Sleep => y-axis
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)

    cy.log("test undo/redo of add numeric attribute to y axis")
    toolbar.getUndoTool().click()
    ah.verifyDefaultAxisLabel("left")

    toolbar.getRedoTool().click()
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)

    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[5], "left")
  })
  it("will add categorical attribute to x axis and categorical attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Habitat", "bottom") // Habitat => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "left") // Diet => y-axis
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")

    // Undo the last change (remove attribute from bottom axis)
    cy.log("test undo/redo of add categorical attribute to x axis and categorical attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
  it("will add categorical attribute to x axis and numeric attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Habitat", "bottom") // Habitat => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[5], "left") // Sleep => y-axis
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[5], "left")

    cy.log("test undo/redo of add categorical attribute to x axis and numeric attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
  it("will add numeric attribute to x axis and categorical attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Height", "bottom") // Height => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "left") // Habitat => y-axis
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "left")
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")

    cy.log("test undo/redo of add numeric attribute to x axis and categorical attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("left")

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
  it("will add numeric attribute to x axis and numeric attribute to y axis with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Height", "bottom") // Height => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[4], "left") // Mass => y-axis
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.verifyAxisTickLabels("left", arrayOfValues[4].values)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[4], "left")
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")

    cy.log("test undo/redo of add numeric attribute to x axis and categorical attribute to y axis")
    // undo removal of attribute _and_ dropping of attribute
    toolbar.getUndoTool().dblclick()
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.verifyAxisTickLabels("left", arrayOfValues[4].values)

    // redo dropping of attribute _and_ removal of attribute
    toolbar.getRedoTool().dblclick()
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
  })
})
