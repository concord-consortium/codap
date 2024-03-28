import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

context("codap plugins", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor&sample=mammals&dashboard`
    cy.visit(url)
  })
  const openAPITester = () => {
    const url='https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en'
    toolbar.getOptionsButton().click()
    toolbar.getWebViewButton().click()
    webView.enterUrl(url)
    cy.wait(1000)
  }
  it.skip('will handle plugin requests', () => {
    openAPITester()

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

    cy.log("Handle create attribute")
    const cmd4 =`{
      "action": "create",
      "resource": "dataContext[Mammals].collection[Mammals].attribute",
      "values": [
        {
          "name": "Heartrate"
        }
      ]
    }`
    table.getAttributeHeader().contains("Heartrate").should("not.exist")
    webView.sendAPITesterCommand(cmd4, cmd3)
    table.getAttributeHeader().contains("Heartrate").should("exist")
    webView.clearAPITesterResponses()

    cy.log("handle delete attribute")
    const cmd5 = `{
      "action": "delete",
      "resource": "dataContext[Mammals].collection[Mammals].attribute[Heartrate]"
    }`
    table.getAttributeHeader().contains("Heartrate").should("exist")
    webView.sendAPITesterCommand(cmd5, cmd4)
    table.getAttributeHeader().contains("Heartrate").should("not.exist")
    webView.clearAPITesterResponses()

    cy.log("Finds the default dataset when no dataset is included")
    const cmd6 = `{
      "action": "get",
      "resource": "collection[Mammals].attribute[Order]"
    }`
    webView.sendAPITesterCommand(cmd6, cmd5)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
    webView.clearAPITesterResponses()

    cy.log("Handle get dataContextList request")
    const cmd7 = `{
      "action": "get",
      "resource": "dataContextList"
    }`
    webView.sendAPITesterCommand(cmd7, cmd6)
    webView.confirmAPITesterResponseContains(/"values":\s\[\s{\s"name":\s*"Mammals"/)
    webView.clearAPITesterResponses()
  })
  it('will broadcast notifications', () => {
    openAPITester()
    webView.toggleAPITesterFilter()

    cy.log("Broadcast global value change notifications")
    slider.changeVariableValue(8)
    webView.confirmAPITesterResponseContains(/"action":\s"notify",\s"resource":\s"global/)
    webView.clearAPITesterResponses()
  })
})
