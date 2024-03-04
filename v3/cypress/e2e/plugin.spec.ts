import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { WebViewTileElements } from "../support/elements/web-view-tile"

context("codap plugins", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
  })
  it('will update web view title in response to plugin request', ()=>{
      const url='https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en'
      toolbar.getOptionsButton().click()
      toolbar.getWebViewButton().click()
      WebViewTileElements.enterUrl(url)
      cy.wait(3000)
      WebViewTileElements.getTitle().should("contain.text", "CODAP API Tester")
  })
})
