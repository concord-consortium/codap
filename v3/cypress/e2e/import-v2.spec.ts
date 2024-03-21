import { CfmElements as cfm } from "../support/elements/cfm"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

context("import codap v2 documents", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
  })
  it('will load plugins from v2 documents', () => {
    cfm.getHamburgerMenuButton().click()
    cfm.getHamburgerMenu().find("li").contains("Open...").click()
    cfm.getModalDialog().find(".selectable").contains("Parachute Model").click()
    cfm.getModalDialog().find("button").contains("Open").click()
    webView.getTitle().should("contain.text", "Terminal Velocity")
  })
})
