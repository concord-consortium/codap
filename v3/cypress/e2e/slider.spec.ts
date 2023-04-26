import { SliderTileElements as slider } from "../support/elements/slider-tile"

context("Slider UI", () => {
    beforeEach(function () {
        const queryParams = "?sample=mammals&dashboard&mouseSensor"
        const url = `${Cypress.config("index")}${queryParams}`
        cy.visit(url)
        cy.wait(2500)
    })
    it("does not populate title bar from sample data", () => {
      const sliderName = "v1"
      slider.getComponentTitle().should("contain", sliderName)
    })
})
