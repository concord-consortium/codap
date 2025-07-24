
context("Test beta features", () => {
  const queryParams = "?sample=mammals&dashboard&mouseSensor"
  beforeEach(() => {
    const url = `${Cypress.config("index")}${queryParams}&release=beta`
    cy.visit(url)
    cy.wait(1000)
  })
  it("will display the beta button in beta mode", () => {
    cy.log("The beta button should exist in beta mode")
    cy.get(".beta-button").should("exist")

    cy.log("The beta button should not exist except in beta mode")
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
    cy.get(".beta-button").should("not.exist")
  })
})
