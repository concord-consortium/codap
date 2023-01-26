const arrayOfPlots = [
    { attribute: "Mammal", axis: "x", collection: "mammals" },
    { attribute: "Order", axis: "y", collection: "mammals" },
    { attribute: "LifeSpan", axis: "x1", collection: "mammals" },
    { attribute: "Height", axis: "y1", collection: "mammals" },
    { attribute: "Mass", axis: "x", collection: "mammals" },
    { attribute: "Sleep", axis: "y", collection: "mammals" },
    { attribute: "Speed", axis: "x1", collection: "mammals" },
    { attribute: "Habitat", axis: "graph_plot", collection: "mammals" },
    { attribute: "Diet", axis: "graph_plot", collection: "mammals" }
]

context("Test graph plot transitions", () => {
    before(function () {
        const queryParams = "?sample=mammals&mouseSensor"
        const url = `${Cypress.config("index")}${queryParams}`
        cy.visit(url)
        cy.wait(2500)
    })
    it("will add attributes to a graph and verify plot transitions are correct", () => {
        cy.wrap(arrayOfPlots).each((hash, index, list) => {
            cy.dragAttributeToTarget("table", hash.attribute, hash.axis)
            cy.wait(2000)
            // cy.matchImageSnapshot(`${hash.attribute}_on_${hash.axis}`)
        })
    })
})
