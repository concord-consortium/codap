import { DataSummaryTileElements as dataSummary } from "../support/elements/data-summary-tile"

context("Data summary UI", () => {
    before(function () {
        const queryParams = "?sample=mammals&mouseSensor"
        const url = `${Cypress.config("index")}${queryParams}`
        cy.visit(url)
        cy.wait(2500)
    })
    it("populates title bar from sample data", () => {
      const collectionName = "Mammals"
      dataSummary.getCollectionTitle().should("contain", collectionName)
    })
})
