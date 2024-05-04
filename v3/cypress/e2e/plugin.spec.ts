import { CfmElements as cfm } from "../support/elements/cfm"
import { ComponentElements as c } from "../support/elements/component-elements"
import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

context("codap plugins", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?sample=mammals&dashboard`
    cy.visit(url)
  })
  const openAPITester = () => {
    const url='https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en'
    toolbar.getOptionsButton().click()
    toolbar.getWebViewButton().click()
    webView.enterUrl(url)
    cy.wait(1000)
  }

  it('will handle plugin requests', () => {
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

  it('will handle component related requests', () => {
    openAPITester()

    cy.log("Handle get componentList request")
    const cmd1 = `{
      "action": "get",
      "resource": "componentList"
    }`
    webView.sendAPITesterCommand(cmd1)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
    webView.getAPITesterResponse().then((value: any) => {
      // Find the id of the table component
      const response = JSON.parse(value.eq(1).text())
      const tableInfo = response.values.find((info: any) => info.type === "caseTable")
      const tableId = tableInfo.id

      cy.log("Select component using notify component command")
      c.checkComponentFocused("table", false)
      const cmd2 = `{
        "action": "notify",
        "resource": "component[${tableId}]",
        "values": {
          "request": "select"
        }
      }`
      webView.clearAPITesterResponses()
      webView.sendAPITesterCommand(cmd2, cmd1)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.clearAPITesterResponses()
      c.checkComponentFocused("table")

      cy.log("Delete component using delete component command")
      const cmd3 = `{
        "action": "delete",
        "resource": "component[${tableId}]"
      }`
      webView.sendAPITesterCommand(cmd3, cmd2)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.clearAPITesterResponses()
      c.checkComponentDoesNotExist("table")
    })
  })

  it('will broadcast notifications', () => {
    openAPITester()
    webView.toggleAPITesterFilter()

    cy.log("Broadcast attribute notifications")

    cy.log("Broadcast hideAttributes notifications")
    c.selectTile("table", 0)
    table.openAttributeMenu("Mammal")
    table.selectMenuItemFromAttributeMenu("Hide Attribute")
    webView.confirmAPITesterResponseContains(/"operation":\s"hideAttributes/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast unhideAttributes notifications")
    table.showAllAttributes()
    webView.confirmAPITesterResponseContains(/"operation":\s"unhideAttributes/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast createAttributes notifications")
    // + button in collection header
    table.addNewAttribute()
    webView.confirmAPITesterResponseContains(/"operation":\s"createAttributes/)
    webView.clearAPITesterResponses()
    // New Attribute button in ruler menu
    table.getRulerButton().click()
    table.selectItemFromRulerMenu("New Attribute")
    webView.confirmAPITesterResponseContains(/"operation":\s"createAttributes/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast deleteAttributes notifications")
    table.deleteAttrbute("newAttr2")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteAttributes/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast updateAttributes notifications")
    // Rename attribute
    const newName = "newerAttr"
    table.renameAttribute("newAttr", newName)
    webView.confirmAPITesterResponseContains(/"operation":\s"updateAttributes/)
    webView.clearAPITesterResponses()
    // Edit attribute properties
    table.editAttributeProperties(newName, "", null, null, null, null, null)
    webView.confirmAPITesterResponseContains(/"operation":\s"updateAttributes/)
    webView.clearAPITesterResponses()
    // Edit formula
    table.editFormula(newName, "Mass * 2")
    webView.confirmAPITesterResponseContains(/"operation":\s"updateAttributes/)
    // Edit formula also broadcasts an updateCases notification
    webView.confirmAPITesterResponseContains(/"operation":\s"updateCases/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast updateCases notifications")
    table.getGridCell(2, 2).dblclick()
    table.getGridCell(2, 2).find("input").type("test{enter}")
    webView.confirmAPITesterResponseContains(/"operation":\s"updateCases/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast updateCollection notifications")
    table.renameCollection("c1", "Mammals")
    webView.confirmAPITesterResponseContains(/"operation":\s"updateCollection/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast global value change notifications")
    slider.changeVariableValue(8)
    webView.confirmAPITesterResponseContains(/"action":\s"notify",\s"resource":\s"global/)
    webView.clearAPITesterResponses()

    slider.playSliderButton()
    webView.confirmAPITesterResponseContains(/"action":\s"notify",\s"resource":\s"global/)
    slider.pauseSliderButton()
    webView.clearAPITesterResponses()

    cy.log("Broadcast notifications involving dragging")
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
    table.createNewTableFromToolshelf()
    table.addNewAttribute()
    table.addNewAttribute()
    openAPITester()
    webView.toggleAPITesterFilter()

    cy.log("Broadcast createCollection notifications")
    table.moveAttributeToParent("newAttr2", "newCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"createCollection/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast moveAttribute notifications")
    // Move attribute within the ungrouped collection
    table.moveAttributeToParent("newAttr", "headerDivider", 0)
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.clearAPITesterResponses()
    // Move attribute to a different collection
    table.moveAttributeToParent("newAttr", "prevCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.clearAPITesterResponses()
    // Move attribute within a true collection
    table.moveAttributeToParent("newAttr", "headerDivider", 2)
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast deleteCollection notifications")
    // Move the last attribute from the ungrouped collection to a new collection
    table.moveAttributeToParent("AttributeName", "newCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.confirmAPITesterResponseContains(/"operation":\s"createCollection/)
    webView.clearAPITesterResponses()
    // Move the last attribute from a grouped collection to a new collection
    table.moveAttributeToParent("AttributeName", "newCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.confirmAPITesterResponseContains(/"operation":\s"createCollection/)
    webView.clearAPITesterResponses()
    // Move the last attribute from a grouped collection to an existing collection
    table.moveAttributeToParent("AttributeName", "headerDivider", 2)
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.clearAPITesterResponses()
  })

  it("will broadcoast deleteCollection when deleting the last attribute from a collection", () => {
    cy.log("Broadcast deleteCollection notifications when deleting the final attribute")
    cfm.openExampleDocument("Four Seals")
    cy.wait(2000)
    table.getTableTile().should("contain.text", "Data_Set_1")
    table.deleteAttrbute("species")
    openAPITester()
    webView.toggleAPITesterFilter()
    table.deleteAttrbute("animal_id")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)

    // TODO Check for deleteCollection notifications when deleting the last attribute
    // in the ungrouped collection. This currently doesn't result in the ungrouped collection
    // being removed.
  })
})
