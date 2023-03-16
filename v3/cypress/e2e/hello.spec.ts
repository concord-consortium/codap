import { HelloTileElements as hello } from "../support/elements/hello-tile"

context("Data summary UI", () => {
    before(function () {
        const queryParams = "?sample=mammals&mouseSensor"
        const url = `${Cypress.config("index")}${queryParams}`
        cy.visit(url)
        cy.wait(2500)
    })
    it("populates title bar from sample data", () => {
      const collectionName = "Mammals"
      hello.getCollectionTitle().should("contain", collectionName)
    })
})
