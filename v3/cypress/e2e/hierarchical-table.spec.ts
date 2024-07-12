import { TableTileElements as table } from "../support/elements/table-tile"
import hierarchical from '../fixtures/hierarchical.json'
const values = hierarchical.attributes

context("hierarchical collections", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  hierarchical.tests.forEach((h) => {
    // FIXME: enable skipped tests
    const itOrSkip = h.skip ? it.skip : it
    itOrSkip(`${h.testName}`, () => {
      const collections = h.collections
      collections.forEach((collection, index) => {
        cy.log("Testing collection:", index, "name:", collection.name)
        collection.attributes.forEach(attribute => {
          cy.log("Moving attribute:", attribute.name)
          table.moveAttributeToParent(attribute.name, attribute.move)
          table.getColumnHeaders(collection.index+1).should("not.contain", attribute.name)
          table.getAttribute(attribute.name, collection.index).should("have.text", attribute.name)
          cy.wait(2000)
        })
        table.getCollectionTitle(collection.index).should("have.text", collection.name)
        table.getColumnHeaders(collection.index).should("have.length", collection.attributes.length+1)
        table.getNumOfRows().should("contain", collection.cases+2) // +1 for the header row, +1 for input row
        table.verifyAttributeValues(collection.attributes, values, collection.index)
        cy.wait(2000)

        cy.log("Testing expanding/collapsing...")
        table.verifyCollapseAllGroupsButton(collection.index+1)
        table.collapseAllGroups(collection.index+1)
        table.getNumOfRows(collection.index+1).should("contain", collection.cases+2)
        table.verifyCollapsedRows(collection.childCases, collection.index+1)
        table.expandAllGroups(collection.index+1)
        table.getNumOfRows(collection.index+1).should("contain", collection.totalChildren+2)
      })
    })
  })
})
