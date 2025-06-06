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
    webView.sendAPITesterCommand(cmd2)
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
    webView.sendAPITesterCommand(cmd3)
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
    webView.sendAPITesterCommand(cmd4)
    table.getAttributeHeader().contains("Heartrate").should("exist")
    webView.clearAPITesterResponses()

    cy.log("handle delete attribute")
    const cmd5 = `{
      "action": "delete",
      "resource": "dataContext[Mammals].collection[Cases].attribute[Heartrate]"
    }`
    table.getAttributeHeader().contains("Heartrate").should("exist")
    webView.sendAPITesterCommand(cmd5)
    table.getAttributeHeader().contains("Heartrate").should("not.exist")
    webView.clearAPITesterResponses()

    cy.log("Finds the default dataset when no dataset is included")
    const cmd6 = `{
      "action": "get",
      "resource": "collection[Cases].attribute[Order]"
    }`
    webView.sendAPITesterCommand(cmd6)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
    webView.clearAPITesterResponses()

    cy.log("Handle get dataContextList request")
    const cmd7 = `{
      "action": "get",
      "resource": "dataContextList"
    }`
    webView.sendAPITesterCommand(cmd7)
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
      webView.sendAPITesterCommand(cmd2)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.clearAPITesterResponses()
      c.checkComponentFocused("table")

      cy.log("Delete component using delete component command")
      const cmd3 = `{
        "action": "delete",
        "resource": "component[${tableId}]"
      }`
      webView.sendAPITesterCommand(cmd3)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.clearAPITesterResponses()
      c.checkComponentDoesNotExist("table")
    })
  })

  it('will handle adornment-related requests', () => {

    // Activate the Count/Percent, Mean, and Movable Value adornments on the graph.
    c.selectTile("graph", 0)
    ah.openAxisAttributeMenu("bottom")
    ah.selectMenuAttribute("Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-count-count]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-mean]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-otherValues]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-button-movable-value--add]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-count-percent]").click()

    openAPITester()

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

    cy.get('@graphId').then((graphId) => {
      cy.log("Handle get adornmentList request")
      const cmd2 = `{
        "action": "get",
        "resource": "component[${graphId}].adornmentList"
      }`
      webView.sendAPITesterCommand(cmd2)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.getAPITesterResponse().then((value: any) => {
        const response = JSON.parse(value.eq(1).text())
        expect(response.values.length).to.equal(4)
        const countInfo = response.values[0]
        const percentInfo = response.values[1]
        const meanInfo = response.values[2]
        const movableValueInfo = response.values[3]
        expect(countInfo.type).to.equal("Count")
        expect(countInfo.isVisible).to.equal(true)
        expect(percentInfo.type).to.equal("Percent")
        expect(percentInfo.isVisible).to.equal(true)
        expect(meanInfo.type).to.equal("Mean")
        expect(meanInfo.isVisible).to.equal(true)
        expect(movableValueInfo.type).to.equal("Movable Value")
        expect(movableValueInfo.isVisible).to.equal(true)
        const meanId = meanInfo.id
        cy.wrap(meanId).as('meanId')
      })
      webView.clearAPITesterResponses()

      cy.log("Handle get adornment by type request")
      const cmd3 = `{
        "action": "get",
        "resource": "component[${graphId}].adornment[Count]"
      }`
      webView.sendAPITesterCommand(cmd3)
      webView.confirmAPITesterResponseContains(/"success":\s*true/)
      webView.getAPITesterResponse().then((value: any) => {
        const response = JSON.parse(value.eq(1).text())
        const countInfo = response.values
        expect(countInfo.id).to.be.a("string")
        expect(countInfo.isVisible).to.be.a("boolean")
        expect(countInfo.type).to.eq("Count")
        // Since there is a Movable Value present, the count should be an array containing two numbers.
        expect(countInfo.data[0].count).to.be.a("array")
        expect(countInfo.data[0].count).to.have.length(2)
        expect(countInfo.data[0].count[0]).to.be.a("number")
        expect(countInfo.data[0].count[1]).to.be.a("number")
        const percents = countInfo.data[0].percent
        expect(percents).to.be.an("array").with.length(2)
        percents.forEach((p: string) => expect(p).to.match(/^\d+(\.\d+)?%$/))
        // The sum of all percent values should be ~100%
        const total = percents.reduce((sum: number, p: string) => sum + parseFloat(p), 0)
        expect(total).to.be.closeTo(100, 0.1)
      })
      webView.clearAPITesterResponses()

      cy.log("Handle get adornment by ID request")
      cy.get('@meanId').then((meanId) => {
        const cmd4 = `{
          "action": "get",
          "resource": "component[${graphId}].adornment[${meanId}]"
        }`
        webView.sendAPITesterCommand(cmd4)
        webView.confirmAPITesterResponseContains(/"success":\s*true/)
        webView.getAPITesterResponse().then((value: any) => {
          const response = JSON.parse(value.eq(1).text())
          const meanInfo = response.values
          expect(meanInfo.id).to.be.a("string")
          expect(meanInfo.data[0]).to.haveOwnProperty("mean")
          expect(meanInfo.data[0].mean).to.be.a("number")
        })
        webView.clearAPITesterResponses()

        cy.log("Handle get adornmentList requests after plot type change")
        ah.openAxisAttributeMenu("left")
        ah.selectMenuAttribute("LifeSpan", "left")
        const cmd5 = `{
          "action": "get",
          "resource": "component[${graphId}].adornmentList"
        }`
        webView.sendAPITesterCommand(cmd5)
        webView.confirmAPITesterResponseContains(/"success":\s*true/)
        webView.getAPITesterResponse().then((value: any) => {
          const response = JSON.parse(value.eq(1).text())
          // The previously activated Mean and Movable Value adornments should not be listed
          // since they do not support scatter plots.
          expect(response.values.length).to.equal(2)
          const countInfo = response.values[0]
          const percentInfo = response.values[1]
          expect(countInfo.type).to.equal("Count")
          expect(countInfo.isVisible).to.equal(true)
          expect(percentInfo.type).to.equal("Percent")
          expect(percentInfo.isVisible).to.equal(true)
        })
        webView.clearAPITesterResponses()
      })
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
  })

  it('will broadcast notifications involving dragging attributes within the case table', () => {
    const url = `${Cypress.config("index")}?mouseSensor&noEntryModal`
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
    cy.log("Move attribute within the ungrouped collection")
    table.moveAttributeToParent("newAttr", "headerDivider", 0)
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.clearAPITesterResponses()
    cy.log("Move attribute to a different collection")
    table.moveAttributeToParent("newAttr", "prevCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.clearAPITesterResponses()
    cy.log("Move attribute within a true collection")
    table.moveAttributeToParent("newAttr", "headerDivider", 2)
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
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

    cy.log("Broadcast deleteCollection notifications")
    cy.log("Move the last attribute from the ungrouped collection to a new collection")
    cy.dragAttributeToTarget("table", "Attribute Name", "newCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.confirmAPITesterResponseContains(/"operation":\s"createCollection/)
    webView.clearAPITesterResponses()
    cy.log("Move the last attribute from a grouped collection to a new collection")
    cy.dragAttributeToTarget("table", "Attribute Name", "newCollection")
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.confirmAPITesterResponseContains(/"operation":\s"createCollection/)
    webView.clearAPITesterResponses()
    cy.log("Move the last attribute from a grouped collection to an existing collection")
    cy.dragAttributeToTarget("table", "Attribute Name", "headerDivider", 1)
    webView.confirmAPITesterResponseContains(/"operation":\s"moveAttribute/)
    webView.confirmAPITesterResponseContains(/"operation":\s"deleteCollection/)
    webView.clearAPITesterResponses()
  })

  it("will broadcast deleteCollection when deleting the last attribute from a collection", () => {
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
