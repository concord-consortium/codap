import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

const arrayOfAttributes = [ "Mammal", "Order", "LifeSpan", "Height", "Mass", "Sleep", "Speed", "Habitat", "Diet" ]

// The `values` here are arrays of expected axis tick labels. When written there was an assumption
// that the set of labels would not be dependent on the axis, but since the bottom axis is longer
// than the left axis, recent labeling changes make that no longer the case. So now, these axis
// labels are only correct if the attribute in question is placed on the "correct" axis.
const arrayOfValues = [
  { attribute: "Mammal", values: [ ]},
  { attribute: "Order", values: [ ]},
  { attribute: "LifeSpan", values: [...Array(21).keys()].map(i => `${5 * i - 5}`)},   // X
  { attribute: "Height", values: [...Array(17).keys()].map(i => `${0.5 * i - 0.5}`)}, // X
  { attribute: "Mass", values: [ "0", "1000", "2000", "3000", "4000", "5000", "6000", "7000" ]},  // Y
  { attribute: "Sleep", values: [...Array(12).keys()].map(i => `${2 * i}`)},  // Y
  { attribute: "Speed", values: [ ]},
  { attribute: "Habitat", values: [ "both", "land", "water" ]},
  { attribute: "Diet", values: [ "both", "meat", "plants" ]},
]

context("Test graph axes with various attribute types", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("will show default x axis label", () => {
    ah.verifyDefaultAxisLabel("bottom")
    ah.verifyDefaultAxisLabel("left")
  })
  it("will add categorical attribute to x axis", () => {
    // Adding the attribute
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "bottom") // Habitat => x-axis
    cy.wait(2000)
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")

    // Undo adding the attribute
    // This test fails due to PT #187262957
    // toolbar.getUndoTool().click()
    // cy.wait(2000)
    // Verify the attribute was removed
    // ah.verifyDefaultAxisLabel("bottom")

    // Redo adding the attribute
    // This test fails due to PT #187262957
    // toolbar.getRedoTool().click()

    // Verify the attribute was added back
    // ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
  })
  it("will add numeric attribute to x axis", () => {
    // Adding the attribute
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // LifeSpan => x-axis
    cy.wait(2000)
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[2].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")

    // Undo adding the attribute
    // This test fails due to PT #187262957
    // toolbar.getUndoTool().click()
    // cy.wait(2000)
    // Verify the attribute was added back
    // ah.verifyAxisTickLabels("bottom", arrayOfValues[2].values)

    // Redo adding the attribute
    // toolbar.getRedoTool().click()
    // cy.wait(2000)
    // Verify the attribute was removed
    // ah.verifyDefaultAxisLabel("bottom")
  })
  it("will add categorical attribute to y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "left") // Diet => y-axis
    cy.wait(2000)
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[8].values, true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[8], "left")

    // TODO: add undo/redo test (PT #187262957)
  })
  it("will add numeric attribute to y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[5], "left") // Sleep => y-axis
    cy.wait(2000)
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed()
    ah.verifyYAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("left", arrayOfValues[5].values)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[5], "left")

    // TODO: add undo/redo test (PT #187262957)
  })
  it("will add categorical attribute to x axis and categorical attribute to y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "bottom") // Habitat => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "left") // Diet => y-axis
    cy.wait(2000)
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

    // TODO: Add checks for undo/redo
    // see PT #187279762 and #187262957
  })
  it("will add categorical attribute to x axis and numeric attribute to y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "bottom") // Habitat => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[5], "left") // Sleep => y-axis
    cy.wait(2000)
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

    // TODO: add checks for undo/redo
    // see PT #187319588 and #187262957
  })
  it("will add numeric attribute to x axis and categorical attribute to y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[3], "bottom") // Height => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "left") // Habitat => y-axis
    cy.wait(2000)
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

    // TODO: add checks for undo/redo
    // see PT #187319588 and #187262957
  })
  it("will add numeric attribute to x axis and numeric attribute to y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[3], "bottom") // Height => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[4], "left") // Mass => y-axis
    cy.wait(2000)
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

    // TODO: add checks for undo/redo
    // see PT #187262957
  })
  it("will split an axis into identical sub axes when categorical attribute is on opposite split", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[4], "bottom") // Mass => x-axis
    cy.wait(500)
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "top") // Habitat => top split
    cy.wait(500)
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 3)
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").each((wrapper) => {
      cy.wrap(wrapper).find(".tick").should("have.length", 4)
    })
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").each((wrapper) => {
      cy.wrap(wrapper).find(".tick").each((tick, index) => {
        const value = index * 2000
        cy.wrap(tick).invoke("text").should("eq", value.toString())
      })
    })
    ah.openAxisAttributeMenu("top")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "top")
    cy.wait(500)
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)
  })
  it("will test graph with numeric x-axis and two numeric y-attributes", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // Lifespan => x-axis
    cy.wait(500)
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)
    cy.dragAttributeToTarget("table", arrayOfAttributes[3], "left") // Height => left split
    cy.wait(500)
    cy.dragAttributeToTarget("table", arrayOfAttributes[5], "yplus") // Sleep => left split
    cy.wait(500)

    // checks for multiple y-axis labels
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyYAxisTickMarksDisplayed()
    cy.get("[data-testid=graph]").find("[data-testid=attribute-label]").should("have.text", "LifeSpanHeight, Sleep")
    ah.verifyAxisTickLabel("left", "0", 0)
    cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)

    // TODO: add checks for undo/redo
  })
  it("will adjust axis domain when points are changed to bars with undo/redo", () => {
    // When there are no negative numeric values, such as in the case of Height, the domain for the primary
    // axis of a univariate plot showing bars should start at zero.
    cy.dragAttributeToTarget("table", arrayOfAttributes[3], "bottom") // Height => x-axis
    cy.wait(500)
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyAxisTickLabel("bottom", "−0.5", 0)

    // Changing to bars and verifying axis adjustment
    cy.get("[data-testid=graph-display-config-button").click()
    cy.wait(500)
    cy.get("[data-testid=bars-radio-button]").click()
    cy.wait(500)
    ah.verifyAxisTickLabel("bottom", "0", 0)

    // Undo the change to bars (expect to revert to points)
    toolbar.getUndoTool().click()
    cy.wait(500)

    // Verify the axis label reverts to the initial state for points
    ah.verifyAxisTickLabel("bottom", "−0.5", 0)

    // Redo the change to bars
    toolbar.getRedoTool().click()
    cy.wait(500)

    // Verify the axis label adjusts correctly for bars again
    ah.verifyAxisTickLabel("bottom", "0", 0)

    // Switch back to points without undo/redo to clean up state
    cy.get("[data-testid=graph-display-config-button").click()
    cy.wait(500)
    cy.get("[data-testid=points-radio-button]").click()
    cy.wait(500)
    ah.verifyAxisTickLabel("bottom", "−0.5", 0)
  })
})

context("Test graph axes attribute menu", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("will open and close x axis attribute menu when clicked on default axis label", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.verifyRemoveAttributeDoesNotExist("bottom")
    ah.verifyTreatAsOptionDoesNotExist("bottom")
    ah.openAxisAttributeMenu("bottom")
    ah.verifyAxisMenuIsClosed("bottom")
  })
  it("will open and close y axis attribute menu when clicked on default axis label", () => {
    ah.openAxisAttributeMenu("left")
    ah.verifyRemoveAttributeDoesNotExist("left")
    ah.verifyTreatAsOptionDoesNotExist("left")
    ah.openAxisAttributeMenu("left")
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
    cy.wait(500)

    // Verify the x-axis reverts to its default state after undoing the attribute addition
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")


    // Redo the addition of the categorical attribute
    toolbar.getRedoTool().click()
    cy.wait(500) // Adjust wait time as needed for the redo action to be processed

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
    toolbar.getUndoTool().click()
    cy.wait(500) // Wait for the undo action to process

    // Verify the x-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("bottom")

    // Perform a redo action to reapply the addition of the numeric attribute
    toolbar.getRedoTool().click()
    cy.wait(500) // Wait for the redo action to process

    // Verify the x-axis reflects the readdition of the numeric attribute
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
    toolbar.getUndoTool().click()
    cy.wait(500) // Wait for the undo action to process

    // Verify the y-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("left")

    // Redo the addition of the categorical attribute
    toolbar.getRedoTool().click()
    cy.wait(500) // Wait for the redo action to process

    // Verify the y-axis reflects the readdition of the categorical attribute
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
    toolbar.getUndoTool().click()
    cy.wait(500)

    // Verify the y-axis reverts to its default state after undoing the attribute addition
    ah.verifyDefaultAxisLabel("left")

    // Redo the addition of the numeric attribute
    toolbar.getRedoTool().click()
    cy.wait(500)

    // Verify the y-axis reflects the readdition of the numeric attribute
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
    cy.wait(2000)
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
