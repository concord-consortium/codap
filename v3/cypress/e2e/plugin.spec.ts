import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

context("codap plugins", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor&sample=mammals&dashboard`
    cy.visit(url)
  })
  it('will handle plugin requests', () => {
      const url='https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en'
      toolbar.getOptionsButton().click()
      toolbar.getWebViewButton().click()
      webView.enterUrl(url)
      cy.wait(1000)

      cy.log("Handle update interactiveFrame request")
      webView.getTitle().should("contain.text", "CODAP API Tester")

      cy.log("Handle get attribute request")
      const cmd1 = `{
        "action": "get",
        "resource": "dataContext[Mammals].collection[Mammals].attribute[Order]"
      }`
      webView.sendAPITesterCommand(cmd1)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.clearAPITesterResponses()

      cy.log("Properly handles illegal actions")
      const cmd2 = `{
        "action": "fake",
        "resource": "dataContext[Mammals].collection[Mammals].attribute[Order]"
      }`
      webView.sendAPITesterCommand(cmd2, cmd1)
      webView.confirmAPITesterResponseContains(/"Unsupported action: fake\/attribute"/)
      webView.clearAPITesterResponses()

      cy.log("Handle update attribute hidden")
      const cmd3 = `{
        "action": "update",
        "resource": "dataContext[Mammals].collection[Mammals].attribute[Order]",
        "values": {
          "hidden": true
        }
      }`
      table.getAttributeHeader().contains("Order").should("be.visible")
      webView.sendAPITesterCommand(cmd3, cmd2)
      table.getAttributeHeader().contains("Order").should("not.exist")
      webView.clearAPITesterResponses()

      cy.log("Finds the default dataset when no dataset is included")
      const cmd4 = `{
        "action": "get",
        "resource": "collection[Mammals].attribute[Order]"
      }`
      webView.sendAPITesterCommand(cmd4, cmd3)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.clearAPITesterResponses()

      cy.log("Handle get dataContextList request")
      const cmd5 = `{
        "action": "get",
        "resource": "dataContextList"
      }`
      webView.sendAPITesterCommand(cmd5, cmd4)
      webView.confirmAPITesterResponseContains(/"values":\s\[\s{\s"name":\s*"Mammals"/)
      webView.clearAPITesterResponses()
  })
})
