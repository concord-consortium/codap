import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { AxisElements as ae } from "../support/elements/axis-elements"

let arrayOfAttributes: string[]
let arrayOfValues: Array<{attribute: string, values: string[]}>

context("Test graph axes attribute menu", () => {
  beforeEach(function () {
    cy.fixture('axis-test-data.json').then((data) => {
      arrayOfAttributes = data.attributes
      arrayOfValues = data.values
    })
    const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("will open and close x axis attribute menu when clicked on default axis label", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.verifyRemoveAttributeDoesNotExist("bottom")
    ah.verifyTreatAsOptionDoesNotExist("bottom")
    ah.closeAxisAttributeMenu("bottom")
    ah.verifyAxisMenuIsClosed("bottom")
  })
  it("will open and close y axis attribute menu when clicked on default axis label", () => {
    ah.openAxisAttributeMenu("left")
    ah.verifyRemoveAttributeDoesNotExist("left")
    ah.verifyTreatAsOptionDoesNotExist("left")
    ah.closeAxisAttributeMenu("left")
    ah.verifyAxisMenuIsClosed("left")
  })
  it("will add and remove categorical attribute to x axis from attribute menu with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.addAttributeToAxis(arrayOfAttributes[7], "bottom") // Habitat => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)

    // Undo the addition of the categorical attribute
    // Used force:true because Cypress fails locally at this step
    toolbar.getUndoTool().click({force:true})

    // Verify the x-axis reverts to its default state after undoing the attribute addition
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")

    // Redo the addition of the categorical attribute
    toolbar.getRedoTool().click()

    // Verify the x-axis reflects the re-addition of the categorical attribute
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
  })
  it("will add and remove numeric attribute to x axis from attribute menu with undo/redo", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.addAttributeToAxis(arrayOfAttributes[3], "bottom") // Height => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)

    // Perform an undo action to revert the addition of the numeric attribute
    cy.log("test undo/redo for add and remove numeric attribute to axis from attribute menu")
    toolbar.getUndoTool().click()

    // Verify the x-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("bottom")

    // Perform a redo action to reapply the addition of the numeric attribute
    toolbar.getRedoTool().click()

    // Verify the x-axis reflects the re-addition of the numeric attribute
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)

    // Clean up by removing the attribute
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")
  })
  it("will add and remove categorical attribute to y axis from attribute menu with undo/redo", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[7], "left") // Habitat => y-axis
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)

    // Undo the addition of the categorical attribute
    cy.log("test undo/redo for add/remove categorical attribute to y axis from attribute menu")
    toolbar.getUndoTool().click()

    // Verify the y-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("left")

    // Redo the addition of the categorical attribute
    toolbar.getRedoTool().click()

    // Verify the y-axis reflects the re-addition of the categorical attribute
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)

    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "left")
  })
  it("will add and remove numeric attribute to y axis from attribute menu with undo/redo", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[4], "left") // Mass => y-axis
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[4].values)

    // Undo the addition of the numeric attribute
    cy.log("test undo/redo add and remove numeric attribute to y axis from attribute menu")
    toolbar.getUndoTool().click()

    // Verify the y-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("left")

    // Redo the addition of the numeric attribute
    toolbar.getRedoTool().click()

    // Verify the y-axis reflects the re-addition of the numeric attribute
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[4].values)

    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[4], "left")
  })
  it("will treat numeric attribute on x axis to categorical", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.addAttributeToAxis(arrayOfAttributes[3], "bottom") // Height => x-axis
    ah.openAxisAttributeMenu("bottom")
    ah.treatAttributeAsCategorical("bottom")
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")
  })
  it("will treat numeric attribute on y axis to categorical", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[3], "left")
    ah.openAxisAttributeMenu("left")
    ah.treatAttributeAsCategorical("left")
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "left")
  })
})

context("Test date axes with multiple y-axes", () => {
  let fourSealsValues: Array<{attribute: string, values: string[]}>

  beforeEach(() => {
    cy.fixture('axis-test-data.json').then((data) => {
      fourSealsValues = data.fourSeals.values
    })
    const queryParams = "?mouseSensor=&suppressUnsavedWarning#file=examples:Four%20Seals"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  })

  it("will create a time series graph with multiple y-axes using date x-axis", () => {
    // Create graph with date on x-axis and chlorophyll on y-axis
    ah.openAxisAttributeMenu("bottom")
    ah.selectSubmenuAttribute("date", "Measurements", "bottom")
    cy.dragAttributeToTarget("table", "chlorophyll", "left")

    // Verify initial graph setup
    // For date axis, check all expected labels are present, regardless of order
    ae.getDateAxisTickLabels("bottom").then($labels => {
      const labelTexts = [...$labels].map(el => el.textContent?.trim())
      expect(labelTexts).to.include.members(fourSealsValues[0].values)
    })
    ah.verifyAxisTickLabels("left", fourSealsValues[1].values)

    // Add temperature to second y-axis
    cy.dragAttributeToTarget("table", "temperature", "yplus")

    // Verify multiple y-axes - each y-attribute gets its own separate label
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label]").should("have.text", "date")
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").should("have.length", 2)
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").eq(0).should("have.text", "chlorophyll")
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label-multi-y]").eq(1).should("have.text", "temperature")

    // Explicitly check for the year label on the x-axis
    cy.get('[data-testid="axis-bottom"]').find('text').contains('2005').should('exist')

    // Loosen the assertion for y-axis tick labels
    ah.verifyAxisTickLabelsInclude("left", ["0", "4"])
    ae.getAxisTickLabels("left").then($labels => {
      const labelTexts = [...$labels].map(el => el.textContent?.trim())
      expect(labelTexts).to.not.include("-1")
    })
  })
})
