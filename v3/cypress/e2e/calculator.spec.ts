import { CalculatorTileElements as calc } from "../support/elements/calculator-tile"

context("Data summary UI", () => {
    beforeEach(function () {
        const queryParams = "?sample=mammals&dashboard&mouseSensor"
        const url = `${Cypress.config("index")}${queryParams}`
        cy.visit(url)
        cy.wait(2500)
    })
    it("does not populate title bar from sample data", () => {
      const collectionName = "Calculator"
      calc.getCollectionTitle().should("contain", collectionName)
    })
})
