import { ComponentElements as c } from "../support/elements/component-elements"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

context("web view accessibility", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?sample=mammals&dashboard&suppressUnsavedWarning`
    cy.visit(url)
  })

  describe("iframe title", () => {
    it("has a descriptive title attribute on the iframe", () => {
      c.clickIconFromToolShelf("web page")
      webView.enterUrl("https://example.com")
      // example.com auto-derives the tile name "example", so the title includes it
      cy.get(".codap-web-view-iframe").should("have.attr", "title", "Web page: example")
    })

    it("updates the title when the tile is renamed", () => {
      c.clickIconFromToolShelf("web page")
      webView.enterUrl("https://example.com")
      c.changeComponentTitle("web-view", "My Web Page")
      cy.get(".codap-web-view-iframe").should("have.attr", "title", "Web page: My Web Page")
    })

  })

  describe("loading announcement", () => {
    it("has an aria-live region for status announcements", () => {
      c.clickIconFromToolShelf("web page")
      webView.enterUrl("https://example.com")
      cy.get("[data-testid=codap-web-view] [role=status]").should("exist")
    })
  })

  describe("skip iframe button", () => {
    it("exists and is visually hidden by default", () => {
      c.clickIconFromToolShelf("web page")
      webView.enterUrl("https://example.com")
      cy.get(".codap-skip-iframe").should("exist")
      cy.get(".codap-skip-iframe").should("have.class", "codap-visually-hidden")
    })

    it("moves focus to a different tile when activated", () => {
      // The mammals sample document already has a table tile.
      // Open a web view — it becomes a sibling of the existing table tile.
      c.clickIconFromToolShelf("web page")
      webView.enterUrl("https://example.com")

      // Click the skip button (force: true since it's visually hidden)
      cy.get(".codap-skip-iframe").click({ force: true })

      // Focus should now be on an element that is NOT inside the web view tile
      cy.focused().closest("[data-testid=codap-web-view]").should("not.exist")
    })
  })
})
