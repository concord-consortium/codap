import { SliderTileElements as slider } from "../support/elements/slider-tile"

context("Slider UI", () => {
    beforeEach(function () {
        const queryParams = "?sample=mammals&mouseSensor"
        const url = `${Cypress.config("index")}${queryParams}`
        cy.visit(url)
        cy.wait(2500)
    })
    it("does not populate title bar from sample data", () => {
      const collectionName = "Slider"
      slider.getCollectionTitle().should("contain", collectionName)
    })
})
