import { AxisElements as ae } from "../elements/axis-elements"

export const AxisHelper = {
  verifyDefaultAxisLabel(axis) {
    ae.getDefaultAxisLabel(axis).should("have.text", "Click here, or drag an attribute here.")
  },
  verifyAxisLabel(axis, name) {
    ae.getAxisLabel(axis).should("have.text", name)
  },
  verifyTickMarksDoNotExist(axis, categorical = false) {
    cy.log(`Check no tick marks for axis ${axis}`)
    ae.getTickMarks(axis, categorical).should("not.exist")
  },
  verifyGridLinesDoNotExist(axis, categorical = false) {
    cy.log(`Check no grid lines for axis ${axis}`)
    ae.getGridLines(axis, categorical).should("not.exist")
  },
  verifyXAxisTickMarksNotDisplayed(categorical = false) {
    cy.log(`Check tick marks not displayed for x axis`)
    ae.getTickLength("bottom", "y2", categorical).then($length => {
      expect($length).to.be.lessThan(0)
    })
  },
  verifyXAxisTickMarksDisplayed(categorical = false) {
    cy.log(`Check tick marks displayed for x axis`)
    ae.getTickLength("bottom", "y2", categorical).then($length => {
      expect($length).to.be.greaterThan(0)
    })
  },
  verifyYAxisTickMarksNotDisplayed(categorical = false) {
    cy.log(`Check tick marks not displayed for y axis`)
    ae.getTickLength("left", "x2", categorical).then($length => {
      expect($length).to.be.greaterThan(0)
    })
  },
  verifyYAxisTickMarksDisplayed(categorical = false) {
    cy.log(`Check tick marks displayed for y axis`)
    ae.getTickLength("left", "x2", categorical).then($length => {
      expect($length).to.be.lessThan(0)
    })
  },
  verifyXAxisGridLinesNotDisplayed(categorical = false) {
    cy.log(`Check grid lines not displayed for x axis`)
    ae.getGridLineLength("bottom", "y2", categorical).then($length => {
      expect($length).to.be.greaterThan(0)
    })
  },
  verifyXAxisGridLinesDisplayed(categorical = false) {
    cy.log(`Check grid lines displayed for x axis`)
    ae.getGridLineLength("bottom", "y2", categorical).then($length => {
      expect($length).to.be.lessThan(0)
    })
  },
  verifyYAxisGridLinesNotDisplayed(categorical = false) {
    cy.log(`Check grid lines not displayed for y axis`)
    ae.getGridLineLength("left", "x2", categorical).then($length => {
      expect($length).to.be.lessThan(0)
    })
  },
  verifyYAxisGridLinesDisplayed(categorical = false) {
    cy.log(`Check grid lines displayed for y axis`)
    ae.getGridLineLength("left", "x2", categorical).then($length => {
      expect($length).to.be.greaterThan(0)
    })
  },
  verifyAxisTickLabels(axis, attributeValues, categorical = false) {
    ae.getAxisTickLabels(axis, categorical).should('have.length', attributeValues.length)
    for (let index = 0; index < attributeValues; index++) {
      this.verifyAxisTickLabel(axis, attributeValues[index], index, categorical)
    }
  },
  verifyAxisTickLabel(axis, attributeValue, index, categorical = false) {
    ae.getAxisTickLabel(axis, index, categorical).invoke("text").should("eq", attributeValue)
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
