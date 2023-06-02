import { ComponentElements as c } from "../support/elements/component-elements"

context("Data summary UI", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("populates title bar from sample data", () => {
    const collectionName = "Mammals"
    c.getComponentTitle("data-summary").should("contain", collectionName)
  })
})
