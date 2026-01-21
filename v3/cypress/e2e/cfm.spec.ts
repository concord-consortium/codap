import { CfmElements as cfm } from "../support/elements/cfm"
import { ComponentElements as c } from "../support/elements/component-elements"
import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements } from "../support/elements/toolbar-elements"

context("CloudFileManager", () => {
  function visitEmptyCodap()  {
    const queryParams = "?mouseSensor&noEntryModal&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
  }

  it("Opens Mammals document using different methods", () => {
    cy.log("Opening via a url parameter")
    const mammalsUrl = "https://codap-resources.concord.org/example-documents/documents/mammals.codap"
    cy.visit(`${Cypress.config("index")}?url=${mammalsUrl}&suppressUnsavedWarning`)
    cy.get(".codap-component.codap-case-table").contains(".title-bar", "Mammals").should("exist")

    // The title is not set to mammals because the CFM is not reading the name from the document
    // nor is it looking at the filename in the URL. This behaves the same in CODAPv2.
    // If this ever gets fixed it should be:
    // cy.title().should("equal", "mammals - CODAP")
    cy.title().should("equal", "Untitled Document - CODAP")

    cy.log("Opening via the CFM Open dialog")
    visitEmptyCodap()
    cy.title().should("equal", "Untitled Document - CODAP")

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

    // once loaded, Open dialog should be hidden and document content should be shown
    cfm.getModalDialog().should("not.exist")
    cy.get(".codap-component.codap-case-table").contains(".title-bar", "Mammals").should("exist")
    cy.title().should("equal", "Mammals - CODAP")
  })
  it("Opens a local document using different methods", () => {
    const fileName = "../v3/cypress/fixtures/mammals.codap"
    const CSVFileName = "../v3/cypress/fixtures/map-data.csv"
    const invalidDocsFolder = "../v3/cypress/fixtures/invalid-docs/"
    const erroringDocuments = [
      "invalid-content",
      "invalid-json",
      "invalid-rowmap",
      "numeric-version-with-content",
      "numeric-version"
    ]

    cy.log("Opens a CODAP document from a local file using CFM dialog")
    visitEmptyCodap()

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

    cy.title().should("equal", "mammals - CODAP")

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

    cy.log("Shows errors with invalid documents")
    for (const docFileName of erroringDocuments) {
      cfm.openLocalDoc(`${invalidDocsFolder}${docFileName}.codap`)
      // version is overridden, so it no longer generates an error
      if (!docFileName.includes("numeric-version")) {
        cfm.getModalDialog().contains(".modal-dialog-title", "Error")
        cfm.getModalDialog()
          .contains("button", "Close")
          .click()
        cy.title().should("equal", "Untitled Document - CODAP")
      }
      else {
        cy.title().should("include", docFileName)
      }
    }
  })
  it("verify language menu is present", () => {
    visitEmptyCodap()

    cfm.getLanguageMenuButton().should("exist")
    cfm.getLanguageMenu().should("not.exist")
    cfm.getLanguageMenuButton().click()
    cfm.getLanguageMenu().should("exist")
    cfm.getLanguageMenuButton().click()
    cfm.getLanguageMenu().should("not.exist")
  })
  it("can switch toolbar position", () => {
    visitEmptyCodap()

    ToolbarElements.confirmToolbarPosition("Top")
    cfm.getSettingsMenuButton().click()
    cfm.getSettingsMenuItems().eq(0).click()
    ToolbarElements.confirmToolbarPosition("Left")
    cfm.getSettingsMenuButton().click()
    cfm.getSettingsMenuItems().eq(0).click()
    ToolbarElements.confirmToolbarPosition("Top")
  })
  // TODO: Investigate and fix - test failing due to external Activity Player changes (CODAP-1082)
  it.skip("should display in the Activity Player", () => {
    // Ignore uncaught exceptions from the application for this test only
    Cypress.on('uncaught:exception', (err) => {
      // returning false here prevents Cypress from failing the test
      return false
    })

    const activityPlayerUrl = Cypress.config("v3ActivityPlayerUrl")
    cy.visit(activityPlayerUrl)

    // Verify activity player loaded
    cy.get("[data-cy='activity-title']", { timeout: 10000 })
      .should("exist")
      .and("contain.text", "Test CODAP v3")

    cy.get("[data-cy='activity-nav-header']").should("exist")

    // Navigate to page 8
    cy.get("[data-cy='nav-pages-button']")
      .filter("[aria-label='Page 8']")
      .first()
      .should("have.text", "8")
      .click()
      .then(() => {
        // Wait for page content to load including iframe
        cy.wait(15000)
      })

    // Verify iframe exists and has loaded
    cy.get('iframe')
      .should('be.visible')
      .then($iframe => {
        cy.wrap($iframe)
          .should('have.prop', 'contentDocument')
          .should('not.be.null')
      })

    // Verify content inside the iframe
    cy.get('iframe')
      .first()
      .its('0.contentDocument.body')
      .then(body => {
        cy.wrap(body)
          .should('contain.text', 'Hello from Activity Player')
      })
  })
})
