import { CfmElements as cfm } from "../support/elements/cfm"

function launchFeatureTour() {
  cfm.getHelpMenuButton().click()
  cfm.getHelpMenu().contains(".menuItem", "Feature Tour").click()
}

context("Feature Tour", () => {
  beforeEach(() => {
    const url = `${Cypress.config("index")}?mouseSensor&noEntryModal&suppressUnsavedWarning`
    cy.visit(url)
  })

  it("shows Feature Tour in the Help menu", () => {
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenu().should("be.visible")
    cfm.getHelpMenu().contains(".menuItem", "Feature Tour").should("be.visible")
  })

  it("launches the tour when Feature Tour is clicked", () => {
    launchFeatureTour()
    cy.get(".driver-popover").should("be.visible")
    cy.get(".driver-popover-description")
      .should("contain.text", "Welcome to CODAP")
  })

  it("advances to next step when Next is clicked", () => {
    launchFeatureTour()
    cy.get(".driver-popover").should("be.visible")
    cy.get(".driver-popover-next-btn").click()
    cy.get(".driver-popover-title").should("contain.text", "File Menu")
  })

  it("dismisses the tour when close button is clicked", () => {
    launchFeatureTour()
    cy.get(".driver-popover").should("be.visible")
    cy.get(".driver-popover-close-btn").click()
    cy.get(".driver-popover").should("not.exist")
  })

  it("dismisses the tour when Escape is pressed", () => {
    launchFeatureTour()
    cy.get(".driver-popover").should("be.visible")
    cy.get("body").type("{esc}")
    cy.get(".driver-popover").should("not.exist")
  })

  it("navigates with arrow keys", () => {
    launchFeatureTour()
    cy.get(".driver-popover").should("be.visible")
    cy.get("body").type("{rightarrow}")
    cy.get(".driver-popover-title").should("contain.text", "File Menu")
    cy.get("body").type("{leftarrow}")
    cy.get(".driver-popover-description")
      .should("contain.text", "Welcome to CODAP")
  })

  it("shows progress text", () => {
    launchFeatureTour()
    cy.get(".driver-popover-progress-text")
      .should("contain.text", "1 of 21")
  })

  it("all tour target selectors exist in the DOM", () => {
    // Menu bar selectors
    cy.get('[data-testid="codap-menu-bar"]').should("exist")
    cy.get(".menu-bar-left .file-menu-button").should("exist")
    cy.get(".menu-bar-content-filename").should("exist")
    cy.get(".menu-bar-center").should("exist")
    cy.get(".help-menu").should("exist")
    cy.get(".settings-menu").should("exist")
    cy.get(".lang-menu").should("exist")
    // Tool shelf selectors
    cy.get('[data-testid="tool-shelf"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-table"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-graph"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-map"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-slider"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-calc"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-text"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-web page"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-plugins"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-undo"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-redo"]').should("exist")
    cy.get('[data-testid="tool-shelf-button-tiles"]').should("exist")
    // Workspace
    cy.get(".document-container").should("exist")
  })

  it("works with toolbar in left position", () => {
    // Switch toolbar to left
    cy.get(".settings-menu .cfm-menu.menu-anchor").click()
    cy.get(".cfm-menu.menu-showing .menuItem").first().click()
    // Launch tour
    launchFeatureTour()
    cy.get(".driver-popover").should("be.visible")
    cy.get(".driver-popover-description")
      .should("contain.text", "Welcome to CODAP")
  })
})
