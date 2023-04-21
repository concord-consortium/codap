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
        ah.verifyDefaultAxisLabel("x")
        ah.verifyDefaultAxisLabel("y")
    })
    it("will add categorical attribute to x axis", () => {
        cy.dragAttributeToTarget("table", arrayOfAttributes[7], "x") // Habitat => x-axis
        cy.wait(2000)
        ah.verifyTickMarksDoNotExist("y")
        ah.verifyGridLinesDoNotExist("y")
        ah.verifyXAxisTickMarksNotDisplayed()
        ah.verifyXAxisGridLinesDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[7].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[7], "x")
    })
    it("will add numeric attribute to x axis", () => {
        cy.dragAttributeToTarget("table", arrayOfAttributes[2], "x") // LifeSpan => x-axis
        cy.wait(2000)
        ah.verifyTickMarksDoNotExist("y")
        ah.verifyGridLinesDoNotExist("y")
        ah.verifyXAxisTickMarksDisplayed()
        ah.verifyXAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[2].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[2], "x")
    })
    it("will add categorical attribute to y axis", () => {
        cy.dragAttributeToTarget("table", arrayOfAttributes[8], "y") // Diet => y-axis
        cy.wait(2000)
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksNotDisplayed()
        ah.verifyYAxisGridLinesDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[8].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[8], "y")
    })
    it("will add numeric attribute to y axis", () => {
        cy.dragAttributeToTarget("table", arrayOfAttributes[5], "y") // Sleep => y-axis
        cy.wait(2000)
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyYAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[5].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[5], "y")
    })
    it("will add categorical attribute to x axis and categorical attribute to y axis", () => {
        cy.dragAttributeToTarget("table", arrayOfAttributes[7], "x") // Habitat => x-axis
        cy.dragAttributeToTarget("table", arrayOfAttributes[8], "y") // Diet => x-axis
        cy.wait(2000)
        ah.verifyXAxisTickMarksNotDisplayed()
        ah.verifyXAxisGridLinesDisplayed()
        ah.verifyYAxisTickMarksNotDisplayed()
        ah.verifyYAxisGridLinesDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[7].values)
        ah.verifyAxisTickLabels("y", arrayOfValues[8].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[7], "x")
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksNotDisplayed()
        ah.verifyYAxisGridLinesDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[8].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[8], "y")
    })
    it("will add categorical attribute to x axis and numeric attribute to y axis", () => {
        cy.dragAttributeToTarget("table", arrayOfAttributes[7], "x") // Habitat => x-axis
        cy.dragAttributeToTarget("table", arrayOfAttributes[5], "y") // Sleep => y-axis
        cy.wait(2000)
        ah.verifyXAxisTickMarksNotDisplayed()
        ah.verifyXAxisGridLinesDisplayed()
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyYAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[7].values)
        ah.verifyAxisTickLabels("y", arrayOfValues[5].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[7], "x")
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyYAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[5].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[5], "y")
    })
    it("will add numeric attribute to x axis and categorical attribute to y axis", () => {
        cy.dragAttributeToTarget("table", arrayOfAttributes[3], "x") // Height => x-axis
        cy.dragAttributeToTarget("table", arrayOfAttributes[7], "y") // Habitat => y-axis
        cy.wait(2000)
        ah.verifyXAxisTickMarksDisplayed()
        ah.verifyXAxisGridLinesNotDisplayed()
        ah.verifyYAxisTickMarksNotDisplayed()
        ah.verifyYAxisGridLinesDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[3].values)
        ah.verifyAxisTickLabels("y", arrayOfValues[7].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[7], "y")
        ah.verifyTickMarksDoNotExist("y")
        ah.verifyGridLinesDoNotExist("y")
        ah.verifyXAxisTickMarksDisplayed()
        ah.verifyXAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[3].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[3], "x")
    })
    it("will add numeric attribute to x axis and numeric attribute to y axis", () => {
        cy.dragAttributeToTarget("table", arrayOfAttributes[3], "x") // Height => x-axis
        cy.dragAttributeToTarget("table", arrayOfAttributes[4], "y") // Mass => y-axis
        cy.wait(2000)
        ah.verifyXAxisTickMarksDisplayed()
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[3].values)
        ah.verifyAxisTickLabels("y", arrayOfValues[4].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[4], "y")
        ah.verifyTickMarksDoNotExist("y")
        ah.verifyGridLinesDoNotExist("y")
        ah.verifyXAxisTickMarksDisplayed()
        ah.verifyXAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[3].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[3], "x")
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
        ah.openAxisAttributeMenu("x")
        ah.verifyRemoveAttributeDoesNotExist("x")
        ah.verifyTreatAsOptionDoesNotExist("x")
        ah.openAxisAttributeMenu("x")
        ah.verifyAxisMenuIsClosed("x")
    })
    it("will open and close y axis attribute menu when clicked on default axis label", () => {
        ah.openAxisAttributeMenu("y")
        ah.verifyRemoveAttributeDoesNotExist("y")
        ah.verifyTreatAsOptionDoesNotExist("y")
        ah.openAxisAttributeMenu("y")
        ah.verifyAxisMenuIsClosed("y")
    })
    it("will add and remove categorical attribute to x axis from attribute menu", () => {
        ah.openAxisAttributeMenu("x")
        ah.addAttributeToAxis(arrayOfAttributes[7], "x") // Habitat => x-axis
        ah.verifyTickMarksDoNotExist("y")
        ah.verifyGridLinesDoNotExist("y")
        ah.verifyXAxisTickMarksNotDisplayed()
        ah.verifyXAxisGridLinesDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[7].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[7], "x")
    })
    it("will add and remove numeric attribute to x axis from attribute menu", () => {
        ah.openAxisAttributeMenu("x")
        ah.addAttributeToAxis(arrayOfAttributes[3], "x") // Height => x-axis
        ah.verifyTickMarksDoNotExist("y")
        ah.verifyGridLinesDoNotExist("y")
        ah.verifyXAxisTickMarksDisplayed()
        ah.verifyXAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[3].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[3], "x")
    })
    it("will add and remove categorical attribute to y axis from attribute menu", () => {
        ah.openAxisAttributeMenu("y")
        ah.addAttributeToAxis(arrayOfAttributes[7], "y") // Habitat => y-axis
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksNotDisplayed()
        ah.verifyYAxisGridLinesDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[7].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[7], "y")
    })
    it("will add and remove numeric attribute to y axis from attribute menu", () => {
        ah.openAxisAttributeMenu("y")
        ah.addAttributeToAxis(arrayOfAttributes[4], "y") // Mass => y-axis
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyYAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[4].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[4], "y")
    })
    // TODO: figure out why this test started failing on ci build (but works locally)
    it.skip("will treat numeric attribute on x axis to categorical", () => {
        ah.openAxisAttributeMenu("x")
        ah.addAttributeToAxis(arrayOfAttributes[3], "x") // Height => x-axis
        ah.openAxisAttributeMenu("x")
        ah.treatAttributeAsCategorical("x")
        ah.verifyTickMarksDoNotExist("y")
        ah.verifyGridLinesDoNotExist("y")
        ah.verifyXAxisTickMarksNotDisplayed()
        ah.verifyXAxisGridLinesDisplayed()
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[3], "x")
    })
    // TODO: figure out why this test started failing on ci build (but works locally)
    it.skip("will treat numeric attribute on y axis to categorical", () => {
        ah.openAxisAttributeMenu("y")
        ah.addAttributeToAxis(arrayOfAttributes[3], "y")
        cy.wait(2000)
        ah.openAxisAttributeMenu("y")
        ah.treatAttributeAsCategorical("y")
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksNotDisplayed()
        ah.verifyYAxisGridLinesDisplayed()
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[3], "y")
    })
})
