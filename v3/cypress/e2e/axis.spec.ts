import { AxisHelper as ah } from "../support/helpers/axis-helper"

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
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "bottom") // Habitat => x-axis
    cy.wait(2000)
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
  })
  it("will add numeric attribute to x axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[2], "bottom") // LifeSpan => x-axis
    cy.wait(2000)
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[2].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[2], "bottom")
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
  })
  it("will add categorical attribute to x axis and categorical attribute to y axis", () => {
    cy.dragAttributeToTarget("table", arrayOfAttributes[7], "bottom") // Habitat => x-axis
    cy.dragAttributeToTarget("table", arrayOfAttributes[8], "left") // Diet => x-axis
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
  })
  it("will adjust axis domain when points are changed to bars", () => {
    // When there are no negative numeric values, such as in the case of Height, the domain for the primary
    // axis of a univariate plot showing bars should start at zero. So for this test we essentially subtract
    // the first tick value from arrayOfValues[3].values (i.e. -0.5) to test that the domain starts at zero
    // when the display type changes to bars.
    const arrayOfBarValues = [...arrayOfValues[3].values].slice(0, 16)
    cy.dragAttributeToTarget("table", arrayOfAttributes[3], "bottom") // Height => x-axis
    cy.wait(500)
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    cy.get("[data-testid=graph-display-config-button").click()
    cy.wait(500)
    cy.get("[data-testid=bars-radio-button]").click()
    cy.wait(500)
    ah.verifyAxisTickLabels("bottom", arrayOfBarValues)
    cy.wait(500)
    cy.get("[data-testid=points-radio-button]").click()
    cy.wait(500)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
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
  it("will add and remove categorical attribute to x axis from attribute menu", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.addAttributeToAxis(arrayOfAttributes[7], "bottom") // Habitat => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed(true)
    ah.verifyXAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("bottom", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "bottom")
  })
  it("will add and remove numeric attribute to x axis from attribute menu", () => {
    ah.openAxisAttributeMenu("bottom")
    ah.addAttributeToAxis(arrayOfAttributes[3], "bottom") // Height => x-axis
    ah.verifyTickMarksDoNotExist("left")
    ah.verifyGridLinesDoNotExist("left")
    ah.verifyXAxisTickMarksDisplayed()
    ah.verifyXAxisGridLinesNotDisplayed()
    ah.verifyAxisTickLabels("bottom", arrayOfValues[3].values)
    ah.openAxisAttributeMenu("bottom")
    ah.removeAttributeFromAxis(arrayOfAttributes[3], "bottom")
  })
  it("will add and remove categorical attribute to y axis from attribute menu", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[7], "left") // Habitat => y-axis
    ah.verifyTickMarksDoNotExist("bottom")
    ah.verifyGridLinesDoNotExist("bottom")
    ah.verifyYAxisTickMarksDisplayed(true)
    ah.verifyYAxisGridLinesDisplayed(true)
    ah.verifyAxisTickLabels("left", arrayOfValues[7].values, true)
    ah.openAxisAttributeMenu("left")
    ah.removeAttributeFromAxis(arrayOfAttributes[7], "left")
  })
  it("will add and remove numeric attribute to y axis from attribute menu", () => {
    ah.openAxisAttributeMenu("left")
    ah.addAttributeToAxis(arrayOfAttributes[4], "left") // Mass => y-axis
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
