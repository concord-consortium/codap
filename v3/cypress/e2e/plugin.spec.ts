import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

context("codap plugins", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor&sample=mammals&dashboard`
    cy.visit(url)
  })
  it('will update web view title in response to plugin request', ()=>{
      const url='https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en'
      toolbar.getOptionsButton().click()
      toolbar.getWebViewButton().click()
      webView.enterUrl(url)
      cy.wait(1000)
      webView.getTitle().should("contain.text", "CODAP API Tester")

      cy.log("Handle get attribute request")
      const cmd1 = `{
        "action": "get",
        "resource": "dataContext[Mammals].collection[Mammals].attribute[Order]"
      }`
      webView.sendAPITesterCommand(cmd1)
      webView.confirmAPITesterResponseContains(/.*"success":\s*true.*/)
      webView.clearAPITesterResponses()

      cy.log("Properly handles illegal actions")
      const cmd2 = `{
        "action": "fake",
        "resource": "dataContext[Mammals].collection[Mammals].attribute[Order]"
      }`
      webView.sendAPITesterCommand(cmd2, cmd1)
      webView.confirmAPITesterResponseContains(/.*"Unsupported action: fake\/attribute".*/)
      webView.clearAPITesterResponses()

      cy.log("Finds the default dataset when no dataset is included")
      const cmd3 = `{
        "action": "get",
        "resource": "collection[Mammals].attribute[Order]"
      }`
      webView.sendAPITesterCommand(cmd3, cmd2)
      webView.confirmAPITesterResponseContains(/.*"success":\s*true.*/)
      webView.clearAPITesterResponses()

      cy.log("Handle update attribute request")
      const cmd4 = `{
        "action": "update",
        "resource": "dataContext[Mammals].collection[Mammal].attribute[Order]",
        "values": {
          "title": "new title",
          "name": "new name",
          "description": "new description",
          "unit": "new unit",
          "formula": "new formula",
          "editable": false,
          "type": "qualitative",
          "precision": 10
        }
      }`
      webView.sendAPITesterCommand(cmd4, cmd3)
      webView.confirmAPITesterResponseContains(/.*"description":\s*"new description".*/)
      webView.confirmAPITesterResponseContains(/.*"editable":\s*false.*/)
      webView.confirmAPITesterResponseContains(/.*"formula":\s*"new formula".*/)
      webView.confirmAPITesterResponseContains(/.*"name":\s*"new name".*/)
      webView.confirmAPITesterResponseContains(/.*"precision":\s*10.*/)
      webView.confirmAPITesterResponseContains(/.*"title":\s*"new title".*/)
      webView.confirmAPITesterResponseContains(/.*"type":\s*"qualitative".*/)
      webView.confirmAPITesterResponseContains(/.*"unit":\s*"new unit".*/)
      table.getColumnHeaders().contains("new name (new unit)").should("exist")
      webView.clearAPITesterResponses()

      cy.log("Illegal types will not update attribute")
      const cmd5 = `{
        "action": "update",
        "resource": "dataContext[Mammals].collection[Mammal].attribute[new name]",
        "values": {
          "type": "fake type"
        }
      }`
      webView.sendAPITesterCommand(cmd5, cmd4)
      webView.confirmAPITesterResponseContains(/.*"type":\s*"qualitative".*/)
      webView.clearAPITesterResponses()
  })
})
