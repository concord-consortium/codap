import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import hierarchical from '../fixtures/hierarchical.json'
type HierarchicalTest = typeof hierarchical.tests[number] & { only?: boolean }

const values = hierarchical.attributes

context("hierarchical collections", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&mouseSensor&scrollBehavior=auto&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(1000)
  })
  hierarchical.tests.forEach((h: HierarchicalTest) => {
    // FIXME: enable skipped tests
    const itOrSkip = h.skip ? it.skip : h.only ? it.only : it
    itOrSkip(`${h.testName}`, () => {
      const collections = h.collections
      collections.forEach((collection, index) => {
        cy.log("Testing collection:", index, "name:", collection.name)
        collection.attributes.forEach(attribute => {
          cy.log("Moving attribute:", attribute.name)
          table.moveAttributeToParent(attribute.name, attribute.move)
          table.getColumnHeaders(collection.index+1).should("not.contain", attribute.name)
          table.getAttribute(attribute.name, collection.index).should("have.text", attribute.name)
        })
        table.getCollectionTitle(collection.index).should("have.text", collection.name)
        table.getColumnHeaders(collection.index).should("have.length", collection.attributes.length+1)
        table.getNumOfRows().should("contain", collection.cases+2) // +1 for the header row, +1 for input row
        table.verifyAttributeValues(collection.attributes, values, collection.index)

        cy.log("Testing expanding/collapsing...")
        table.verifyCollapseAllGroupsButton(collection.index+1)
        table.collapseAllGroups(collection.index+1)
        table.getNumOfRows(collection.index+1).should("contain", collection.cases+2)
        table.verifyCollapsedRows(collection.childCases, collection.index+1)
        // clicking on collapsed row should select cases within it along with parent case
        table.getIndexCellInRow(2, collection.index+1).click()
        table.getSelectedRow(2, collection.index).should("exist")
        table.expandAllGroups(collection.index+1)
        table.getNumOfRows(collection.index+1).should("contain", collection.totalChildren+2)
      })
    })
  })

  it(`Input row works in hierarchical tables`, () => {
    table.moveAttributeToParent("Order", "newCollection")
    table.getNumOfRows(1).should("contain", 14)
    table.getNumOfRows(2).should("contain", 29)
    table.getCaseTableGridForCollection().scrollTo("bottom")
    table.getGridCell(14, 2).dblclick()
    table.getGridCell(14, 2).find("input").type("New Order{enter}")
    table.getNumOfRows(1).should("contain", 15)
    table.getNumOfRows(2).should("contain", 30)

    // TODO The child row isn't properly scrolling all the way to the bottom, or the bottom is blocked,
    // which makes it impossible to add a new case to it using the input row
    // table.getCaseTableGridForCollection(2).scrollTo("bottom")
    // table.getGridCell(30, 2, 2).dblclick({ force: true })
    // table.getGridCell(30, 2, 2).find("input").type("New Mammal{enter}")
    // table.getNumOfRows(1).should("contain", 15)
    // table.getNumOfRows(2).should("contain", 31)
  })

  it("verify insert case in hierarchical table", () => {
    table.moveAttributeToParent("Order", "newCollection")
    table.getNumOfRows(1).should("contain", 14)
    table.getNumOfRows(2).should("contain", 29)

    // Insert a new case
    table.openIndexMenuForRow(3, 2)
    table.insertCase()
    table.getNumOfRows(1).should("contain", 14)
    table.getNumOfRows(2).should("contain", 30)

    // delete the new case
    table.openIndexMenuForRow(3, 2)
    table.deleteCase()
    table.getNumOfRows(1).should("contain", 14)
    table.getNumOfRows(2).should("contain", 29)

    // Undo delete
    toolbar.getUndoTool().click()
    table.getNumOfRows(1).should("contain", 14)
    table.getNumOfRows(2).should("contain", 30)

    // Undo insert
    toolbar.getUndoTool().click()
    table.getNumOfRows(1).should("contain", 14)
    table.getNumOfRows(2).should("contain", 29)

    // Redo insert
    toolbar.getRedoTool().click()
    table.getNumOfRows(1).should("contain", 14)
    table.getNumOfRows(2).should("contain", 30)

    // Redo delete
    toolbar.getRedoTool().click()
    table.getNumOfRows(1).should("contain", 14)
    table.getNumOfRows(2).should("contain", 29)
  })

})
