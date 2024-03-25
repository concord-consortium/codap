import { CfmElements as cfm } from "../support/elements/cfm"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

context("import codap v2 documents", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
  })
  it('will load plugins from v2 documents', () => {
    cfm.openExampleDocument("Markov Game")
    cy.wait(1000)
    webView.getIFrame().find(".welcome").should("contain.text",
      "Save Madeline the dog by winning at Rock Paper Scissors.")
    cfm.openExampleDocument("Parachute Model")
    webView.getTitle().should("contain.text", "Terminal Velocity")
  })
})
