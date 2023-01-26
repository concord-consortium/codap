import { AxisHelper as ah } from "../support/helpers/AxisHelper"

const arrayOfAttributes = [ "Mammal", "Order", "LifeSpan", "Height", "Mass", "Sleep", "Speed", "Habitat", "Diet" ]

const arrayOfValues = [
    { attribute: "Mammal", values: [ ]},
    { attribute: "Order", values: [ ]},
    { attribute: "LifeSpan", values: [ "0", "10", "20", "30", "40", "50", "60", "70", "80", "90" ]},
    { attribute: "Height", values: [ "0", "1", "2", "3", "4", "5", "6", "7" ]},
    { attribute: "Mass", values: [ "0", "1000", "2000", "3000", "4000", "5000", "6000", "7000" ]},
    { attribute: "Sleep", values: [ ]},
    { attribute: "Speed", values: [ ]},
    { attribute: "Habitat", values: [ "both", "land", "water" ]},
    { attribute: "Diet", values: [ "both", "meat", "plants" ]},
]

context("Test graph axes with various attribute types", () => {
    before(function () {
        const queryParams = "?sample=mammals&mouseSensor"
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
        cy.dragAttributeToTarget("table", arrayOfAttributes[3], "y") // Height => y-axis
        cy.wait(2000)
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyYAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[3].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[8], "y")
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
        cy.dragAttributeToTarget("table", arrayOfAttributes[3], "y") // Height => y-axis
        cy.wait(2000)
        ah.verifyXAxisTickMarksNotDisplayed()
        ah.verifyXAxisGridLinesDisplayed()
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyYAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[7].values)
        ah.verifyAxisTickLabels("y", arrayOfValues[3].values)
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[7], "x")
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyYAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[3].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[3], "y")
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
        cy.dragAttributeToTarget("table", arrayOfAttributes[2], "y") // LifeSpan => y-axis
        cy.wait(2000)
        ah.verifyXAxisTickMarksDisplayed()
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyAxisTickLabels("x", arrayOfValues[3].values)
        ah.verifyAxisTickLabels("y", arrayOfValues[2].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[2], "y")
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
    before(function () {
        const queryParams = "?sample=mammals"
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
        ah.addAttributeToAxis(arrayOfAttributes[7], "x")
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
        ah.addAttributeToAxis(arrayOfAttributes[3], "x")
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
        ah.addAttributeToAxis(arrayOfAttributes[7], "y")
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksNotDisplayed()
        ah.verifyYAxisGridLinesDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[7].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[7], "y")
    })
    it("will add and remove numeric attribute to x axis from attribute menu", () => {
        ah.openAxisAttributeMenu("y")
        ah.addAttributeToAxis(arrayOfAttributes[3], "y")
        ah.verifyTickMarksDoNotExist("x")
        ah.verifyGridLinesDoNotExist("x")
        ah.verifyYAxisTickMarksDisplayed()
        ah.verifyYAxisGridLinesNotDisplayed()
        ah.verifyAxisTickLabels("y", arrayOfValues[3].values)
        ah.openAxisAttributeMenu("y")
        ah.removeAttributeFromAxis(arrayOfAttributes[3], "y")
    })
    it("will treat numeric attribute on x axis to categorical", () => {
        ah.openAxisAttributeMenu("x")
        ah.addAttributeToAxis(arrayOfAttributes[3], "x")
        ah.openAxisAttributeMenu("x")
        ah.treatAttributeAsCategorical("x")
        ah.verifyTickMarksDoNotExist("y")
        ah.verifyGridLinesDoNotExist("y")
        ah.verifyXAxisTickMarksNotDisplayed()
        ah.verifyXAxisGridLinesDisplayed()
        ah.openAxisAttributeMenu("x")
        ah.removeAttributeFromAxis(arrayOfAttributes[3], "x")
    })
    it("will treat numeric attribute on y axis to categorical", () => {
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
