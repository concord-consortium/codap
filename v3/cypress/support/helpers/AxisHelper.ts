import { AxisElements as ae } from "../elements/AxisElements"

export const AxisHelper = {
    verifyDefaultAxisLabel(axis) {
        ae.getAxisLabel(axis).should("have.text", "Click here, or drag an attribute here.")
    },
    verifyAxisLabel(axis, name) {
        ae.getAxisLabel(axis).should("have.text", name)
    },
    verifyTickMarksDoNotExist(axis) {
        cy.log(`Check no tick marks for axis ${axis}`)
        ae.getTickMarks(axis).should("not.exist")
    },
    verifyGridLinesDoNotExist(axis) {
        cy.log(`Check no grid lines for axis ${axis}`)
        ae.getTickMarks(axis).should("not.exist")
    },
    verifyXAxisTickMarksNotDisplayed() {
        cy.log(`Check tick marks not displayed for x axis`)
        ae.getTickLength("x", "y2").then($length => {
            expect($length).to.be.lessThan(0)
        })
    },
    verifyXAxisTickMarksDisplayed() {
        cy.log(`Check tick marks displayed for x axis`)
        ae.getTickLength("x", "y2").then($length => {
            expect($length).to.be.greaterThan(0)
        })
    },
    verifyYAxisTickMarksNotDisplayed() {
        cy.log(`Check tick marks not displayed for y axis`)
        ae.getTickLength("y", "x2").then($length => {
            expect($length).to.be.greaterThan(0)
        })
    },
    verifyYAxisTickMarksDisplayed() {
        cy.log(`Check tick marks displayed for y axis`)
        ae.getTickLength("y", "x2").then($length => {
            expect($length).to.be.lessThan(0)
        })
    },
    verifyXAxisGridLinesNotDisplayed() {
        cy.log(`Check grid lines not displayed for x axis`)
        ae.getTickLength("x", "y2").then($length => {
            expect($length).to.be.greaterThan(0)
        })
    },
    verifyXAxisGridLinesDisplayed() {
        cy.log(`Check grid lines displayed for x axis`)
        ae.getTickLength("x", "y2").then($length => {
            expect($length).to.be.lessThan(0)
        })
    },
    verifyYAxisGridLinesNotDisplayed() {
        cy.log(`Check grid lines not displayed for y axis`)
        ae.getTickLength("y", "x2").then($length => {
            expect($length).to.be.lessThan(0)
        })
    },
    verifyYAxisGridLinesDisplayed() {
        cy.log(`Check grid lines displayed for y axis`)
        ae.getTickLength("y", "x2").then($length => {
            expect($length).to.be.greaterThan(0)
        })
    },
    verifyAxisTickLabels(axis, attributeValues) {
        ae.getAxisTickLabels(axis).should('have.length', attributeValues.length)
        for (let index = 0; index < attributeValues; index++) {
            this.verifyAxisTickLabel(axis, attributeValues[index], index)
        }
    },
    verifyAxisTickLabel(axis, attributeValue, index) {
        ae.getAxisTickLabel(axis, index).invoke("text").should("eq", attributeValue)
    },
    verifyRemoveAttributeDoesNotExist(axis) {
        ae.getAttributeFromAttributeMenu(axis).contains(`Remove`).should("not.exist")
    },
    verifyTreatAsOptionDoesNotExist(axis) {
        ae.getAttributeFromAttributeMenu(axis).contains(`Treat as`).should("not.exist")
    },
    verifyAxisMenuIsClosed(axis) {
        ae.getAttributeFromAttributeMenu(axis).find("div>div").should("not.be.visible")
    },
    openAxisAttributeMenu(axis) {
        ae.getAxisAttributeMenu(axis).click()
    },
    addAttributeToAxis(name, axis) {
        ae.getAttributeFromAttributeMenu(axis).contains(name).click()
        cy.wait(2000)
    },
    removeAttributeFromAxis(name, axis) {
        ae.getAttributeFromAttributeMenu(axis).contains(`Remove`).click()
    },
    treatAttributeAsCategorical(axis) {
        ae.getAttributeFromAttributeMenu(axis).contains("Treat as Categorical").click()
    },
    treatAttributeAsNumeric(axis) {
        ae.getAttributeFromAttributeMenu(axis).contains("Treat as Numeric").click()
    }
}
