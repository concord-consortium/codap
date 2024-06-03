import { CfmElements as cfm } from "../support/elements/cfm"

context("CloudFileManager", () => {
  beforeEach(function () {
      const queryParams = "?mouseSensor"
      const url = `${Cypress.config("index")}${queryParams}`
      cy.visit(url)
      cy.wait(2500)
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
  // it("Opens a CODAP document via CFM Open dialog", () => {

  // })
  // it("Opens a csv document via CFM Open dialog", () => {

  // })
  // it("Opens a JSON document via CFM Open dialog", () => {

  // })
})
