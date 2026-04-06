import { ComponentElements as c } from "../support/elements/component-elements"

const queryParams = "?sample=mammals&dashboard&mouseSensor&noEntryModal&suppressUnsavedWarning"

context("Keyboard Navigation", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.get("[data-testid=tool-shelf]").should("be.visible")
    cy.get(".codap-component").should("exist")
  })

  describe("Section navigation (Ctrl+.)", () => {
    it("cycles forward through menu bar, tool shelf, and tile area", () => {
      // Start by focusing the tool shelf so we have a known starting point
      cy.get("[data-testid=tool-shelf]").find("button").first().focus()
      cy.get("[data-testid=tool-shelf]").find("button").first().should("have.focus")

      // Ctrl+. should move to tile area
      cy.realPress(["Control", "."])
      cy.focused().closest("main").should("exist")

      // Ctrl+. should move to menu bar
      cy.realPress(["Control", "."])
      cy.focused().closest("[data-testid=codap-menu-bar]").should("exist")

      // Ctrl+. should move back to tool shelf
      cy.realPress(["Control", "."])
      cy.focused().closest("[data-testid=tool-shelf]").should("exist")
    })

    it("cycles backward with Shift+Ctrl+.", () => {
      // Start from tool shelf
      cy.get("[data-testid=tool-shelf]").find("button").first().focus()

      // Shift+Ctrl+. should move to menu bar (backward from tool shelf)
      cy.realPress(["Shift", "Control", "."])
      cy.focused().closest("[data-testid=codap-menu-bar]").should("exist")
    })

    it("remembers last-focused element per section", () => {
      // Focus a specific button in the tool shelf (not the first one)
      cy.get("[data-testid=tool-shelf]").find("button").eq(2).as("thirdButton")
      cy.get("@thirdButton").focus()
      cy.get("@thirdButton").should("have.focus")

      // Navigate away to tile area, then to menu bar
      cy.realPress(["Control", "."])
      cy.focused().closest("main").should("exist")
      cy.realPress(["Control", "."])
      cy.focused().closest("[data-testid=codap-menu-bar]").should("exist")

      // Navigate back to tool shelf — should restore focus within tool shelf
      cy.realPress(["Control", "."])
      cy.focused().closest("[data-testid=tool-shelf]").should("exist")
      cy.get("@thirdButton").should("have.focus")
    })
  })

  describe("Tile-to-tile navigation (Ctrl+;)", () => {
    it("cycles forward through tiles", () => {
      // Focus a tile
      c.getComponentTile("table").click()
      c.getComponentTile("table").should("have.class", "focused")

      // Ctrl+; should move to the next tile
      cy.realPress(["Control", ";"])
      cy.focused().closest(".codap-component").should("exist")
        .invoke("attr", "data-testid").should("not.match", /table$/)
    })

    it("cycles backward with Shift+Ctrl+;", () => {
      // Focus a tile
      c.getComponentTile("table").click()

      // Shift+Ctrl+; should move to a different tile
      cy.realPress(["Shift", "Control", ";"])
      cy.focused().closest(".codap-component").should("exist")
        .and("not.have.attr", "data-testid", "codap-table")
    })

    it("wraps from last tile to first", () => {
      // Get all visible tiles to know how many times to press Ctrl+;
      cy.get(".free-tile-component:visible").then($tiles => {
        const tileCount = $tiles.length

        // Focus the first tile
        c.getComponentTile("table").click()

        // Navigate forward through all tiles — should wrap back
        for (let i = 0; i < tileCount; i++) {
          cy.realPress(["Control", ";"])
        }
        // After a full cycle, we should be back at the table
        cy.focused().closest(".codap-component[data-testid$=table]").should("exist")
      })
    })
  })

  describe("Tab trapping within tiles", () => {
    it("traps Tab within a tile and does not escape", () => {
      // Focus the table tile
      c.getComponentTile("table").click()

      // Press Tab several times — focus should stay within the tile's free-tile-component wrapper
      for (let i = 0; i < 5; i++) {
        cy.realPress("Tab")
        cy.focused().closest(".free-tile-component").find(".codap-component[data-testid$=table]")
          .should("exist")
      }
    })

    it("traps Shift+Tab within a tile", () => {
      // Focus the table tile
      c.getComponentTile("table").click()

      // Press Shift+Tab several times — focus should stay within the tile's free-tile-component wrapper
      for (let i = 0; i < 5; i++) {
        cy.realPress(["Shift", "Tab"])
        cy.focused().closest(".free-tile-component").find(".codap-component[data-testid$=table]")
          .should("exist")
      }
    })
  })

  describe("Tile/inspector panel toggle (Ctrl+\\)", () => {
    it("toggles focus between tile content and inspector panel", () => {
      // Focus a tile to make its inspector panel visible
      c.getComponentTile("table").click()
      c.getComponentTile("table").should("have.class", "focused")

      // Ctrl+\ should move focus to inspector panel
      cy.realPress(["Control", "\\"])
      cy.focused().closest("[data-testid=inspector-panel]").should("exist")

      // Ctrl+\ again should move focus back to tile content
      cy.realPress(["Control", "\\"])
      cy.focused().closest(".codap-component").should("exist")
    })

    it("Escape from inspector panel returns to tile content", () => {
      // Focus a tile and switch to inspector
      c.getComponentTile("table").click()
      cy.realPress(["Control", "\\"])
      cy.focused().closest("[data-testid=inspector-panel]").should("exist")

      // Escape should return to tile content
      cy.realPress("Escape")
      cy.focused().closest(".codap-component[data-testid$=table]").should("exist")
    })
  })

  describe("Tiles menu shortcut (Ctrl+')", () => {
    it("opens the Tiles menu", () => {
      // Ctrl+' should open the tiles list menu
      cy.realPress(["Control", "'"])
      cy.get("[data-testid=tiles-list-menu]").should("be.visible")
      cy.get("[data-testid=tiles-list-menu-item]").should("have.length.greaterThan", 0)
    })
  })

  describe("Toolbar clamping", () => {
    it("does not wrap arrow key navigation at the start of the tool shelf", () => {
      // Focus the first button in the tool shelf
      cy.get("[data-testid=tool-shelf]").find("button")
        .filter((_, el) => !Cypress.$(el).closest(".tool-shelf-menu-list").length)
        .first().as("firstButton")
      cy.get("@firstButton").focus()

      // ArrowLeft from the first item should stay on the first item
      cy.realPress("ArrowLeft")
      cy.get("@firstButton").should("have.focus")
    })

    it("does not wrap arrow key navigation at the end of the tool shelf", () => {
      cy.get("[data-testid=tool-shelf]").find("button")
        .filter((_, el) => !Cypress.$(el).closest(".tool-shelf-menu-list").length)
        .last().as("lastButton")
      cy.get("@lastButton").focus()

      // ArrowRight from the last item should stay on the last item
      cy.realPress("ArrowRight")
      cy.get("@lastButton").should("have.focus")
    })
  })
})
