import { ComponentElements as c } from "../support/elements/component-elements"
import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

// Sends a Chrome DevTools Protocol command to the browser running the tests
function sendCdpCommand(command: string, params: Record<string, unknown> = {}) {
  return cy.wrap(Cypress.automation("remote:debugger:protocol", { command, params }), { log: false })
}

function visitDocument(queryParams: string) {
  cy.visit(`${Cypress.config("index")}?${queryParams}&scrollBehavior=auto&suppressUnsavedWarning`)
  cy.wait(1000)
}

context("clipboard", () => {
  beforeEach(() => {
    sendCdpCommand("Browser.resetPermissions")
    // Chrome refuses clipboard access when the page isn't focused, which an unattended test browser often isn't.
    // Focus emulation makes the page behave as if it were focused.
    sendCdpCommand("Emulation.setFocusEmulationEnabled", { enabled: true })
  })

  afterEach(() => {
    sendCdpCommand("Browser.resetPermissions")
  })

  it("copies case data to the clipboard and imports it into a new table", () => {
    sendCdpCommand("Browser.grantPermissions",
      { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] })

    cy.log("copy data from a single collection")
    visitDocument("sample=mammals")
    c.selectTile("table", 0)
    table.getRulerButton().click()
    table.getCopyToClipboardItem().click()
    table.getCopiedCasesAlert().should("contain", "Copied 27 Cases to the clipboard")
    table.getCopiedCasesAlertOkButton().click()

    cy.log("copy data from one of several collections")
    visitDocument("mouseSensor=#file=examples:Four%20Seals")
    c.selectTile("table", 0)
    table.getRulerButton().click()
    table.getCopyToClipboardItem().click()
    table.getExportDataModalBody().should("contain", "Copy case data from:")
    table.getExportDataCollectionsButton().click()
    table.getExportDataCollectionListItems().should("have.length", 3)
    table.getExportDataCollectionListItems().contains("Tracks").click()
    table.getExportDataCopyButton().click()
    table.getCopiedCasesAlert().should("contain", "Copied 4 Tracks to the clipboard")
    table.getCopiedCasesAlertOkButton().click()

    cy.log("import the copied data into a new table")
    visitDocument("sample=mammals")
    c.clickIconFromToolShelf("table")
    toolbar.getNewCaseTableFromClipboard().click()
    c.getComponentTitle("table", 1).should("contain", "clipboard data")
    table.getAttributeHeader().should("contain", "animal id")
    table.getAttributeHeader().should("contain", "species")
    // header row + 4 cases + input row
    table.getNumOfRows(1, 1).should("eq", "6")
    cy.get("[data-testid=paste-data-text-area]").should("not.exist")
  })

  it("falls back to the paste dialog when reading the clipboard is denied", () => {
    sendCdpCommand("Browser.setPermission",
      { permission: { name: "clipboard-read" }, setting: "denied" })
    visitDocument("sample=mammals")

    c.clickIconFromToolShelf("table")
    toolbar.getNewCaseTableFromClipboard().click()
    cy.contains("Reading from the clipboard failed. Paste your data here:").should("be.visible")
    cy.contains("Your browser is blocking clipboard access. You may be able to allow it in site settings.")
      .should("be.visible")

    cy.log("clicking outside the dialog doesn't close it")
    cy.get(".chakra-modal__content-container").click("topLeft")
    cy.get("[data-testid=paste-data-text-area]").should("be.visible")

    cy.get("[data-testid=paste-data-import-button]").should("be.disabled")
    cy.get("[data-testid=paste-data-text-area]").type("first,second{enter}1,2{enter}3,4")
    cy.get("[data-testid=paste-data-import-button]").click()
    cy.get("[data-testid=paste-data-text-area]").should("not.exist")
    c.getComponentTitle("table", 1).should("contain", "clipboard data")
    table.getAttributeHeader().should("contain", "first")
    table.getAttributeHeader().should("contain", "second")
    // header row + 2 cases + input row
    table.getNumOfRows(1, 1).should("eq", "4")

    cy.log("later imports go straight to the dialog, and Cancel closes it")
    c.clickIconFromToolShelf("table")
    toolbar.getNewCaseTableFromClipboard().click()
    cy.get("[data-testid=paste-data-text-area]").should("be.visible")
    cy.get("[data-testid=paste-data-cancel-button]").click()
    cy.get("[data-testid=paste-data-text-area]").should("not.exist")
    c.getComponentTile("table", 2).should("not.exist")
  })

  it("explains how to export the data when copying fails", () => {
    visitDocument("sample=mammals")
    cy.window().then(win => {
      cy.stub(win.navigator.clipboard, "writeText").rejects(new Error("Write permission denied."))
      cy.stub(win.document, "execCommand").returns(false)
    })
    c.selectTile("table", 0)
    table.getRulerButton().click()
    table.getCopyToClipboardItem().click()
    table.getCopiedCasesAlert()
      .should("contain", "Copying to the clipboard failed. You can use Export Case Data... instead.")
    table.getCopiedCasesAlertOkButton().click()
    table.getCopiedCasesAlert().should("not.exist")
  })
})
