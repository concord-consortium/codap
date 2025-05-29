import { AxisElements as ae } from "../elements/axis-elements"

export const AxisHelper = {
  verifyDefaultAxisLabel(axis: string) {
    ae.getDefaultAxisLabel(axis).should("have.text", "Click here, or drag an attribute here.")
  },
  verifyAxisLabel(axis: string, name: string) {
    ae.getAxisLabel(axis).should("have.text", name)
  },
  verifyTickMarksDoNotExist(axis: string, categorical = false) {
    cy.log(`Check no tick marks for axis ${axis}`)
    ae.getTickMarks(axis, categorical).should("not.exist")
  },
  verifyGridLinesDoNotExist(axis: string, categorical = false) {
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
  verifyAxisTickLabels(axis: string, expectedLabels: string[], categorical = false) {
    ae.getAxisTickLabels(axis, categorical).then($labels => {
      const actualLabels = [...$labels].map(el => el.textContent?.trim().replace(/−/g, '-') ?? '')
      const normalizedExpectedLabels = expectedLabels.map(label => label.replace(/−/g, '-'))
      expect(actualLabels).to.include.members(normalizedExpectedLabels)
    })
  },
  verifyAxisTickLabel(axis: string, attributeValue: string, index: number, categorical = false) {
    attributeValue = attributeValue.replace("-", "\u2212")  // hyphen => unicode minus sign
    ae.getAxisTickLabel(axis, index, categorical).invoke("text").should("eq", attributeValue)
  },
  verifyRemoveAttributeDoesNotExist(axis: string) {
    ae.getAttributeFromAttributeMenu(axis).contains(`Remove`).should("not.exist")
  },
  verifyTreatAsOptionDoesNotExist(axis: string) {
    ae.getAttributeFromAttributeMenu(axis).contains(`Treat as`).should("not.exist")
  },
  verifyAxisMenuIsClosed(axis: string) {
    ae.getAttributeFromAttributeMenu(axis).find("div>div").should("not.be.visible")
  },
  openAxisAttributeMenu(axis: string) {
    ae.getAxisAttributeMenu(axis).click()
  },
  addAttributeToAxis(name: string, axis: string) {
    ae.getAttributeFromAttributeMenu(axis).contains(name).click()
    cy.wait(2000)
  },
  selectMenuAttribute(attributeName: string, axis: string) {
    ae.getAttributeFromAttributeMenu(axis)
      .contains("button", attributeName) // This finds the button with the text
      .click()
    cy.wait(2000)
  },
  removeAttributeFromAxis(name: string, axis: string) {
    ae.getAttributeFromAttributeMenu(axis).contains(`Remove`).click()
  },
  treatAttributeAsCategorical(axis: string) {
    ae.getAttributeFromAttributeMenu(axis).contains("Treat as Categorical").click()
  },
  treatAttributeAsNumeric(axis: string) {
    ae.getAttributeFromAttributeMenu(axis).contains("Treat as Numeric").click()
  },
  verifyAxisTickLabelsInclude(axis: string, expectedLabels: string[]) {
    ae.getAxisTickLabels(axis).then($labels => {
      const labelTexts = [...$labels].map(el => el.textContent?.trim())
      expectedLabels.forEach(label => expect(labelTexts).to.include(label))
    })
  }
}
