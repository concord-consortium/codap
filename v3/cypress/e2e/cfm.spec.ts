import { CfmElements as cfm } from "../support/elements/cfm"
import { ComponentElements as c } from "../support/elements/component-elements"
import { TableTileElements as table } from "../support/elements/table-tile"

context("CloudFileManager", () => {
  beforeEach(function () {
    const queryParams = "?mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
  })
  it("Opens Mammals example document via url parameter", () => {
    const mammalsUrl = "https://codap-resources.s3.amazonaws.com/example-documents/documents/mammals.codap"
    cy.visit(`${Cypress.config("index")}?url=${mammalsUrl}`)
    cy.get(".codap-component.codap-case-table").contains(".title-bar", "Mammals").should("exist")
  })
  it("Opens Mammals example document via CFM Open dialog", () => {
    // hamburger menu is hidden initially
    cfm.getHamburgerMenuButton().should("exist")
    cfm.getHamburgerMenu().should("not.exist")
    // hamburger menu is shows when button is clicked
    cfm.getHamburgerMenuButton().click()
    cfm.getHamburgerMenu().should("exist")
    // clicking Open... item closes menu and shows Open dialog
    cfm.getHamburgerMenu().contains("li", "Open...").click()
    cfm.getHamburgerMenu().should("not.exist")
    cfm.getModalDialog().contains(".modal-dialog-title", "Open")
    // Example Documents should be selected by default
    cfm.getModalDialog().contains(".tab-selected", "Example Documents")
    cfm.getModalDialog().contains(".filelist div.selectable", "Four Seals").should("exist")
    cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").should("exist")
    // Selecting Mammals document should load the mammals example document
    cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").click()
    cfm.getModalDialog().contains(".buttons button", "Open").click()
    cy.wait(1000)
    // once loaded, Open dialog should be hidden and document content should be shown
    cfm.getModalDialog().should("not.exist")
    cy.get(".codap-component.codap-case-table").contains(".title-bar", "Mammals").should("exist")
  })
  it("Opens a local document using different methods", () => {
    const fileName = "../v3/cypress/fixtures/mammals.codap"
    const CSVFileName = "../v3/cypress/fixtures/map-data.csv"

    cy.log("Opens a CODAP document from a local file using CFM dialog")

    // Open the document from Hamburger menu
    // Select file from dialog
    cfm.getHamburgerMenuButton().click()
    cfm.getHamburgerMenu().contains("li", "Open...").click()
    cfm.getHamburgerMenu().should("not.exist")
    cfm.getModalDialog().contains(".modal-dialog-title", "Open")
    cfm.getModalDialog().contains("", "Local File").click()
    cfm.getModalDialog()
      .contains(".dropArea", "Drop file here or click here to select a file.")
      .should("exist")
      .click({force:true})
    cy.get('input[type=file]').selectFile(fileName)

    // Verify table in Mammals exists
    table.getAttribute("Order").should("have.text", "Order")
    table.getGridCell(2, 2).should("contain", "African Elephant")

    // Close the document
    // Note: because we aren't changing the document we can close it without the dialog
    cfm.closeDocument()

    // Verify document was closed (table doesn't exist)
    c.checkComponentDoesNotExist("table")

    cy.log("Opens a CODAP document from a local file using drag and drop")
    // Open file using drag and drop
    cfm.openLocalDoc(fileName)

    // Verify existence of table in Mammals
    table.getAttribute("Order").should("have.text", "Order")
    table.getGridCell(2, 2).should("contain", "African Elephant")

    // Close the document
    // Note: because we aren't changing the document we can close it without the dialog
    cfm.closeDocument()

    // Verify document was closed (table doesn't exist)
    c.checkComponentDoesNotExist("table")

    cy.log("Opens a CSV document from a local file using drag and drop")
    cfm.openLocalDoc(CSVFileName)

    // Verify existence of table in Map data
    table.getAttribute("state").should("have.text", "state")
    table.getGridCell(2, 2).should("contain", "Alabama")

    // Close the document
    cfm.closeDocument({discardChanges: true})

    // Verify document was closed (Map data table doesn't exist)
    c.checkComponentDoesNotExist("table")
  })
  it("verify language menu is present", () => {
    cfm.getLanguageMenuButton().should("exist")
    cfm.getLanguageMenu().should("not.exist")
    cfm.getLanguageMenuButton().click()
    cfm.getLanguageMenu().should("exist")
    cfm.getLanguageMenuButton().click()
    cfm.getLanguageMenu().should("not.exist")
  })
})
