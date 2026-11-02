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
