import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { WebViewTileElements } from "../support/elements/web-view-tile"

context("codap plugins", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor&sample=mammals&dashboard`
    cy.visit(url)
  })
  it('will update web view title in response to plugin request', ()=>{
      const url='https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en'
      toolbar.getOptionsButton().click()
      toolbar.getWebViewButton().click()
      WebViewTileElements.enterUrl(url)
      cy.wait(1000)
      WebViewTileElements.getTitle().should("contain.text", "CODAP API Tester")

      cy.log("Handle get attribute request")
      WebViewTileElements.getIFrame().find(`.di-message-area`).type(`{
        "action": "get",
        "resource": "dataContext[Mammals].collection[Mammals].attribute[Order]"
      }`)
      WebViewTileElements.getIFrame().find(`.di-send-button`).click()
      WebViewTileElements.getIFrame().find(`.di-log-message`).contains(/.*"success":\s*true.*/).should("exist")
  })
})
