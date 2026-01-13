import { ComponentElements as c } from "../support/elements/component-elements"
import { TableTileElements as table } from "../support/elements/table-tile"

context("componentMode URL parameter", () => {
  describe("chrome visibility", () => {
    beforeEach(function () {
      const url = `${Cypress.config("index")}?mouseSensor&componentMode=yes`
      cy.visit(url)
    })

    it("should hide the menu bar in component mode", () => {
      cy.get("[data-testid=codap-menu-bar]").should("not.exist")
    })

    it("should hide the tool shelf in component mode", () => {
      cy.get("[data-testid=tool-shelf]").should("not.exist")
    })

    it("should hide the beta banner in component mode", () => {
      cy.get("[data-testid=beta-banner]").should("not.exist")
    })
  })

  describe("component interactions", () => {
    beforeEach(function () {
      // Create a table to interact with
      const url = `${Cypress.config("index")}?sample=mammals&componentMode=yes`
      cy.visit(url)
      cy.wait(1000)
    })

    it("should prevent moving a component by dragging the title bar", () => {
      c.getComponentTitle("table").then((title) => {
        const initialPosition = title.closest(".codap-component").position()
        c.getComponentTitle("table")
          .trigger("mousedown", { force: true })
          .trigger("mousemove", { clientX: 100, clientY: 100, force: true })
          .trigger("mouseup", { force: true })
        cy.wait(200)
        c.getComponentTitle("table").then((newTitle) => {
          const newPosition = newTitle.closest(".codap-component").position()
          expect(newPosition?.top).to.equal(initialPosition?.top)
          expect(newPosition?.left).to.equal(initialPosition?.left)
        })
      })
    })

    it("should hide the close button in component mode", () => {
      c.getCloseButton("table").should("not.exist")
    })

    it("should hide the minimize button in component mode", () => {
      c.getMinimizeButton("table").should("not.exist")
    })

    it("should hide resize handles in component mode", () => {
      c.getResizeControl("table").should("not.exist")
    })

    it("should show grab cursor disabled on title bar in component mode", () => {
      c.getComponentTitleBar("table").find(".title-bar").should("have.class", "not-draggable")
    })
  })

  describe("undo/redo behavior", () => {
    beforeEach(function () {
      const url = `${Cypress.config("index")}?sample=mammals&componentMode=yes`
      cy.visit(url)
      cy.wait(1000)
    })

    it("should show undo/redo buttons in component mode title bar", () => {
      c.getComponentTitleBar("table")
        .find("[data-testid=title-bar-undo-button]")
        .should("be.visible")
      c.getComponentTitleBar("table")
        .find("[data-testid=title-bar-redo-button]")
        .should("be.visible")
    })

    it("should hide undo/redo when hideUndoRedoInComponent=yes", () => {
      const url = `${Cypress.config("index")}?sample=mammals&componentMode=yes&hideUndoRedoInComponent=yes`
      cy.visit(url)
      cy.wait(1000)
      c.getComponentTitleBar("table")
        .find("[data-testid=title-bar-undo-button]")
        .should("not.exist")
      c.getComponentTitleBar("table")
        .find("[data-testid=title-bar-redo-button]")
        .should("not.exist")
    })
  })

  describe("component focus and selection", () => {
    beforeEach(function () {
      const url = `${Cypress.config("index")}?sample=mammals&componentMode=yes`
      cy.visit(url)
      cy.wait(1000)
    })

    it("should auto-focus the first component in component mode", () => {
      c.checkComponentFocused("table", true)
    })
  })

  describe("layout and sizing", () => {
    beforeEach(function () {
      const url = `${Cypress.config("index")}?mouseSensor&componentMode=yes`
      cy.visit(url)
    })

    it("should use full-bleed layout in component mode", () => {
      cy.get(".codap-app").should("have.class", "minimal-chrome")
    })

    it("should hide scrollbars in component mode", () => {
      cy.get(".free-tile-row").should("have.css", "overflow", "hidden")
    })
  })

  describe("splash screen", () => {
    beforeEach(function () {
      const url = `${Cypress.config("index")}?mouseSensor&componentMode=yes`
      cy.visit(url)
    })

    it("should hide splash screen when componentMode=yes", () => {
      // The splash screen is hidden by CSS added in index.html
      cy.get("#splash-screen").should("not.be.visible")
    })
  })

  describe("browser title", () => {
    beforeEach(function () {
      const url = `${Cypress.config("index")}?sample=mammals&mouseSensor&componentMode=yes`
      cy.visit(url)
    })

    it("should not update browser title in component mode", () => {
      // In component mode, the browser title should not be updated based on the document title
      cy.title().then((initialTitle) => {
        // Make a change that would normally update the title
        c.changeComponentTitle("table", "My Table")
        cy.wait(500)
        // Title should remain unchanged
        cy.title().should("equal", initialTitle)
      })
    })
  })

  describe("unsaved changes warning", () => {
    beforeEach(function () {
      const url = `${Cypress.config("index")}?mouseSensor&componentMode=yes`
      cy.visit(url)
    })

    it("component mode is enabled and suppresses warning flag", () => {
      // Verify that component mode is active
      cy.get(".codap-app").should("have.class", "minimal-chrome")

      // The unsaved warning suppression is tested at the unit level
      // Cypress cannot directly test beforeunload handlers
    })
  })

  describe("parameter combinations", () => {
    it("should allow hideUndoRedoInComponent without componentMode having no effect", () => {
      const url = `${Cypress.config("index")}?sample=mammals&hideUndoRedoInComponent=yes`
      cy.visit(url)
      cy.wait(1000)

      // Without componentMode, chrome should be visible
      cy.get("[data-testid=codap-menu-bar]").should("be.visible")

      // And undo/redo buttons should not show (since componentMode is off)
      c.getComponentTitleBar("table")
        .find("[data-testid=title-bar-undo-button]")
        .should("not.exist")
    })

    it("should work with other parameters like sample", () => {
      const url = `${Cypress.config("index")}?sample=mammals&componentMode=yes`
      cy.visit(url)
      cy.wait(1000)

      // Should have loaded the Mammals dataset
      table.getCollection().should("be.visible")

      // And should be in component mode
      cy.get(".codap-app").should("have.class", "minimal-chrome")
    })
  })
})
