import { CfmElements as cfm } from "../support/elements/cfm"

context("About CODAP dialog", () => {
  beforeEach(() => {
    cy.visit("?suppressUnsavedWarning#file=examples:Four%20Seals")
  })

  it("opens from the Help menu, switches views, and closes with Escape", () => {
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenu().find(".separator").should("exist")
    cfm.getHelpMenu().contains(".menuItem", "About CODAP").click()

    cy.get("[role=dialog]").should("be.visible")
      .and("contain.text", "Common Online Data Analysis Platform")
      .and("contain.text", "License & Terms of Use")

    cy.get("[data-testid=about-dialog-acknowledgements]").click()
    cy.get("[role=dialog]").should("contain.text", "CODAP is built with these open-source projects")

    cy.get("[data-testid=about-dialog-footer-back]").click()
    cy.get("[role=dialog]").should("contain.text", "License & Terms of Use")

    cy.realPress("Escape")
    cy.get("[role=dialog]").should("not.exist")
    cfm.getHelpMenuButton().should("have.focus")
  })

  it("lists the bundled open-source libraries and filters them", () => {
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenu().contains(".menuItem", "About CODAP").click()

    cy.get("[data-testid=about-dialog-acknowledgements]").should("contain.text", "projects").click()
    cy.get(".about-dialog-library").should("have.length.greaterThan", 10)
    cy.contains(".about-dialog-library-name", /^react$/).should("exist")

    cy.get("[data-testid=about-dialog-library-search]").type("mobx")
    cy.get(".about-dialog-library-name").each(name => {
      expect(name.text().toLowerCase()).to.contain("mobx")
    })
  })
})

context("About CODAP dialog welcome view", () => {
  beforeEach(() => {
    Cypress.env("showWelcome", true)
  })

  afterEach(() => {
    Cypress.env("showWelcome", false)
  })

  it("opens on top of the entry modal and can be turned off", () => {
    cy.visit("?suppressUnsavedWarning")
    cy.contains("[role=dialog]", "Welcome to CODAP").should("be.visible")
    cy.get("[data-testid=about-dialog-get-started]").should("have.focus")
    // the entry modal is underneath; Cypress doesn't count a covered fixed-position element as visible
    cy.get(".user-entry-modal-container").should("exist").and("not.be.visible")

    cy.get("[data-testid=about-dialog-hide-welcome]").click()
    cy.get("[data-testid=about-dialog-get-started]").click()
    cy.contains("[role=dialog]", "Welcome to CODAP").should("not.exist")

    // the entry modal underneath is uncovered and still works
    cy.get(".user-entry-modal-container").should("be.visible")
    cy.contains(".user-entry-modal-container button", "Create New Document").click()
    cy.get(".user-entry-modal-container").should("not.exist")

    cy.reload()
    cy.get(".user-entry-modal-container").should("be.visible")
    cy.contains("[role=dialog]", "Welcome to CODAP").should("not.exist")
  })
})
