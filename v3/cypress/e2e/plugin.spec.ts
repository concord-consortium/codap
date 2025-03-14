import { CfmElements as cfm } from "../support/elements/cfm"
import { ComponentElements as c } from "../support/elements/component-elements"
import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { TableTileElements as table } from "../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"
import { AxisHelper as ah } from "../support/helpers/axis-helper"
import { GraphTileElements as graph } from "../support/elements/graph-tile"

context("codap plugins", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?sample=mammals&dashboard`
    cy.visit(url)
  })
  const apiTesterUrl='https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en'
  const openAPITester = () => {
    toolbar.getOptionsButton().click()
    toolbar.getWebViewButton().click()
    webView.enterUrl(apiTesterUrl)
    cy.wait(1000)
  }

  it('will open plugin specified in url parameter', () => {
    const url = `${Cypress.config("index")}?di=${apiTesterUrl}`
    cy.visit(url)
    webView.getTitle().should("contain.text", "CODAP API Tester")
  })

  it('will handle plugin requests', () => {
    openAPITester()

    cy.log("Handle update interactiveFrame request")
    webView.getTitle().should("contain.text", "CODAP API Tester")

    cy.log("Handle get attribute request")
    const cmd1 = `{
      "action": "get",
      "resource": "dataContext[Mammals].collection[Cases].attribute[Order]"
    }`
    webView.sendAPITesterCommand(cmd1)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
    webView.clearAPITesterResponses()

    cy.log("Properly handles illegal actions")
    const cmd2 = `{
      "action": "fake",
      "resource": "dataContext[Mammals].collection[Cases].attribute[Order]"
    }`
    webView.sendAPITesterCommand(cmd2, cmd1)
    webView.confirmAPITesterResponseContains(/"Unsupported action: fake\/attribute"/)
    webView.clearAPITesterResponses()

    cy.log("Handle update attribute hidden")
    const cmd3 = `{
      "action": "update",
      "resource": "dataContext[Mammals].collection[Cases].attribute[Order]",
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
      "resource": "dataContext[Mammals].collection[Cases].attribute",
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
      "resource": "dataContext[Mammals].collection[Cases].attribute[Heartrate]"
    }`
    table.getAttributeHeader().contains("Heartrate").should("exist")
    webView.sendAPITesterCommand(cmd5, cmd4)
    table.getAttributeHeader().contains("Heartrate").should("not.exist")
    webView.clearAPITesterResponses()

    cy.log("Finds the default dataset when no dataset is included")
    const cmd6 = `{
      "action": "get",
      "resource": "collection[Cases].attribute[Order]"
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

  it('will handle adornment-related requests', () => {

    // Activate the Mean adornment on the graph.
    c.selectTile("graph", 0)
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-mean]").click()

    openAPITester()
    cy.log("Handle get adornmentList request")
  
    // Get the graph tile ID.
    const cmd1 = `{
      "action": "get",
      "resource": "componentList"
    }`
    webView.sendAPITesterCommand(cmd1)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
    webView.getAPITesterResponse().then((value: any) => {
      const response = JSON.parse(value.eq(1).text())
      const graphInfo = response.values.find((info: any) => info.type === "graph")
      const graphId = graphInfo.id

      cy.wrap(graphId).as('graphId')
    })
    webView.clearAPITesterResponses()
  
    // Get the graph tile's adornment list.
    cy.get('@graphId').then((graphId) => {
      const resource = `component[${graphId}].adornmentList`
      const cmd2 = `{
        "action": "get",
        "resource": "${resource}"
      }`
      webView.sendAPITesterCommand(cmd2, cmd1)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.getAPITesterResponse().then((value: any) => {
        const response = JSON.parse(value.eq(1).text())
        const meanInfo = response.values[0]

        expect(response.values.length).to.equal(1)
        expect(meanInfo.type).to.equal("Mean")
        expect(meanInfo.isVisible).to.equal(true)

      })
      webView.clearAPITesterResponses()
    })
  })

  it("doesn't reload the iframe/plugin on selection change", () => {
    openAPITester()

    const cmd1 = `{
      "action": "get",
      "resource": "componentList"
    }`
    webView.sendAPITesterCommand(cmd1)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)

    c.getComponentTitleBar("table").click()
    c.getComponentTitleBar("codap-web-view").click()
    // if the prior response is still present, then the iframe wasn't reloaded
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
  })

  it('will broadcast notifications', () => {
    openAPITester()
    webView.toggleAPITesterFilter()

    cy.log("Broadcast dataContextCountChanged notifications when dataset is added to document")
    table.createNewTableFromToolShelf()
    c.getComponentTitleInput("table", 1).type("{enter}")
    webView.confirmAPITesterResponseContains(/"operation":\s"dataContextCountChanged/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast dataContextDeleted notifications when dataset is deleted")
    table.deleteDataSetFromToolShelf(1)
    webView.confirmAPITesterResponseContains(/"operation":\s"dataContextDeleted/)
    webView.confirmAPITesterResponseContains(/"deletedContext":\s"New\sDataset/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast select cases notifications")
    table.getCell(2, 2).click()
    webView.confirmAPITesterResponseContains(/"operation":\s"selectCases/)
    webView.confirmAPITesterResponseContains(/"extend":\sfalse/)
    webView.clearAPITesterResponses()
    table.getCell(2, 3).click({ metaKey: true })
    webView.confirmAPITesterResponseContains(/"operation":\s"selectCases/)
    webView.confirmAPITesterResponseContains(/"extend":\strue/)
    webView.clearAPITesterResponses()
    table.getCell(2, 3).click({ metaKey: true })
    webView.confirmAPITesterResponseContains(/"operation":\s"selectCases/)
    webView.confirmAPITesterResponseContains(/"extend":\strue/)
    webView.confirmAPITesterResponseContains(/"removedCases":/)
    webView.clearAPITesterResponses()
    // TODO There are many more ways to select cases that should be covered with tests.

    cy.log("Broadcast update dataContext notifications")
    c.selectTile("table")
    table.getDatasetInfoButton().click()
    table.getDatasetDescriptionTextArea().type("test")
    table.submitDatasetInfo()
    webView.confirmAPITesterResponseContains(/"operation":\s"updateDataContext/)
    webView.clearAPITesterResponses()
    c.changeComponentTitle("table", "Mammals2")
    webView.confirmAPITesterResponseContains(/"operation":\s"updateDataContext/)
    webView.clearAPITesterResponses()

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
    c.getComponentTile("table").click()
    webView.confirmAPITesterResponseContains(/"operation":\s"createAttributes/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast deleteAttributes notifications")
    table.deleteAttribute("newAttr2")
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

    cy.log("Broadcast moveCases notifications")
    table.openAttributeMenu("Mammal")
    table.selectMenuItemFromAttributeMenu("Sort Ascending (A→Z, 0→9)")
    webView.confirmAPITesterResponseContains(/"operation":\s"moveCases/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast deleteCases notifications")
    table.openIndexMenuForRow(2)
    table.deleteCase()
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCases/)
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
    openAPITester()
    webView.toggleAPITesterFilter()
    table.createNewTableFromToolShelf()
    cy.wait(1000)
    c.getResizeControl("table")
    .realMouseDown({ position: "center" })
    .realMouseMove(350, 0)
    .realMouseUp()
    table.addNewAttribute()
    table.addNewAttribute()

    cy.log("Broadcast createCollection notifications")
    table.moveAttributeToParent("newAttr2", "newCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"createCollection/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast moveAttribute notifications")
    // Move attribute within the ungrouped collection
    table.moveAttributeToParent("newAttr", "headerDivider", 0)
    // webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.clearAPITesterResponses()
    // Move attribute to a different collection
    table.moveAttributeToParent("newAttr", "prevCollection")
    // webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.clearAPITesterResponses()
    // Move attribute within a true collection
    table.moveAttributeToParent("newAttr", "headerDivider", 2)
    // webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.clearAPITesterResponses()

    cy.log("Broadcast drag notifications")
    // Drag attribute to plugin
    cy.dragAttributeToTarget("table", "newAttr", "webView")
    webView.confirmAPITesterResponseContains(/"operation":\s"dragstart/)
    webView.confirmAPITesterResponseContains(/"operation":\s"dragend/)
    // TODO Check for other notifications when dragging to plugin
    // webView.confirmAPITesterResponseContains(/"operation":\s"dragenter/)
    // webView.confirmAPITesterResponseContains(/"operation":\s"drag/)
    // webView.confirmAPITesterResponseContains(/"operation":\s"drop/)
    webView.clearAPITesterResponses()
    // TODO Check for dragleave notification when dragging to plugin then out of plugin

    // For tests involving drag and drop of components with attribute "Attribute Name",
    // we use a different drag and drop code because the cy.command version includes a
    // "contains" expectation of text "Attribute Name", which it cannot find because it is over
    // two spans. This code omits the "contains" expectation because the selector already has enough
    // information without needing to find a specific text in a span
    cy.log("Broadcast deleteCollection notifications")
    // Move the last attribute from the ungrouped collection to a new collection
    table.moveTwoLineAttributeNameToTarget("Attribute Name", "newCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.confirmAPITesterResponseContains(/"operation":\s"createCollection/)
    webView.clearAPITesterResponses()
    // Move the last attribute from a grouped collection to a new collection
    table.moveTwoLineAttributeNameToTarget("Attribute Name", "newCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.confirmAPITesterResponseContains(/"operation":\s"createCollection/)
    webView.clearAPITesterResponses()
    // Move the last attribute from a grouped collection to an existing collection
    table.moveTwoLineAttributeNameToTarget("Attribute Name", "headerDivider", 2)
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.clearAPITesterResponses()
  })

  it("will broadcoast deleteCollection when deleting the last attribute from a collection", () => {
    cy.log("Broadcast deleteCollection notifications when deleting the final attribute")
    cfm.openExampleDocument("Four Seals")
    cy.wait(2000)
    table.getTableTile().should("contain.text", "Tracks/Measurements")
    table.deleteAttribute("species")
    openAPITester()
    webView.toggleAPITesterFilter()
    table.deleteAttribute("animal_id")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)

    // TODO Check for deleteCollection notifications when deleting the last attribute
    // in the ungrouped collection. This currently doesn't result in the ungrouped collection
    // being removed.
  })
})
