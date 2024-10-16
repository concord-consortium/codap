import { ComponentElements as c } from "../../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../../support/elements/toolbar-elements"
import { TableTileElements as table } from "../../support/elements/table-tile"
import { GraphTileElements as graph } from "../../support/elements/graph-tile"
import { MapTileElements as map } from "../../support/elements/map-tile"
import { SliderTileElements as slider } from "../../support/elements/slider-tile"
import { CalculatorTileElements as calculator } from "../../support/elements/calculator-tile"
import { WebViewTileElements as webView } from "../../support/elements/web-view-tile"
import { CfmElements as cfm } from "../../support/elements/cfm"


context("codap single smoke test", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
  })

  it.only("verify an empty CODAP document appears", () => {
    cy.log("verifies that toolshelf items open")
    cy.log("will open a new table")
      c.clickIconFromToolShelf("table")
      toolbar.getNewCaseTable().click()
      table.getCollection().should("be.visible")
      c.getComponentTitle("table").should("have.text", "New Dataset")
      c.getIconFromToolShelf("table").click()
      toolbar.getDatasetListedInToolShelf("New Dataset").should("be.visible")
      c.closeComponent("table")

    cy.log("will open a graph")
      c.clickIconFromToolShelf("graph")
      graph.getGraphTile().should("be.visible")
      // graphs with no associated data set should not have a title but show a blank space when hovered
      c.getComponentTitle("graph").should("have.text", "New Dataset")
      // This is the expected behavior, but there's a bug. PT-#188439366
      //c.getComponentTitleBar("graph").trigger("mouseover")
      //c.getComponentTitle("graph").should("have.text", "_____")
      c.closeComponent("graph")

    cy.log("will open a map")
      c.clickIconFromToolShelf("map")
      map.getMapTile().should("be.visible")
      c.getComponentTitle("map").should("have.text", "Map")
      c.closeComponent("map")

    cy.log("will open a slider")
      c.clickIconFromToolShelf("slider")
      slider.getSliderTile().should("be.visible")
      c.getComponentTitle("slider").should("have.text", "v1")
      c.closeComponent("slider")

    cy.log("will open a calculator")
      c.clickIconFromToolShelf("calc")
      calculator.getCalculatorTile().should("be.visible")
      c.getComponentTitle("calculator").should("have.text", "Calculator")
      c.closeComponent("calculator")

    cy.log("plugin menu works")
      c.getIconFromToolShelf("plugins").should("exist").click()
      toolbar.getPluginSelection().should("have.length", 9)
      webView.getTitle().should("not.exist")
      toolbar.getPluginSelection().eq(0).click()
      webView.getTitle().should("have.text", "Sampler")
      toolbar.getPluginSelection().should("not.exist")
  })

  it.only("verify Mammals opens and tests graph and table functionality", () => {
    cy.log("Open Mammals from Hamburger menu")
      // hamburger menu is hidden initially
      cfm.getHamburgerMenuButton().should("exist")
      cfm.getHamburgerMenu().should("not.exist")
      // hamburger menu is shows when button is clicked
      cfm.getHamburgerMenuButton().click()
      cfm.getHamburgerMenu().should("exist")
      // clicking Open... item closes menu and shows Open dialog
      cfm.getHamburgerMenu().contains("li", "Open...").click()
      cfm.getHamburgerMenu().should("not.exist")
      cfm.getModalDialog().contains(".modal-dialog-title", "Open")
      // Example Documents should be selected by default
      cfm.getModalDialog().contains(".tab-selected", "Example Documents")
      cfm.getModalDialog().contains(".filelist div.selectable", "Four Seals").should("exist")
      cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").should("exist")
      // Selecting Mammals document should load the mammals example document
      cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").click()
      cfm.getModalDialog().contains(".buttons button", "Open").click()
      cy.wait(1000)
      // once loaded, Open dialog should be hidden and document content should be shown
      cfm.getModalDialog().should("not.exist")
      cy.get(".codap-component.codap-case-table").contains(".title-bar", "Mammals").should("exist")

    cy.log("Test table functionalities in Mammals sample doc")
      // Test linking of selected cases

    // Test table functionalities: (use cy.log())
      // // Test linking?
      // // Test selecting cases?
      // // Test creating parent collections
      // // Test Expand / collaspe button (?)

      // Test graph functionalities: (use cy.log()) (all with undo/redo if possible)
      // // Click on a data point in graph and verify highlighting (if possible)
      // // Use click and drag to create a graph with x and y attributes and verify the graph axes are made
      // // Change the x and y attributes using the attribute menu and verify new graph axes are made

      // Delete all cases from a table and verify it deletes.

  })



  // (some day) open Roller Coasters
  // use the Hamburger menu to do so

  // (some day) Test the Map component: (use cy.log())
  // // Click on the Map button to open a Map
  // // Add a legend to the map.
  it("will open a new table", () => {
    c.clickIconFromToolShelf("table")
    toolbar.getNewCaseTable().click()
    table.getCollection().should("be.visible")
    c.getComponentTitle("table").should("have.text", "New Dataset")
    c.getIconFromToolShelf("table").click()
    toolbar.getDatasetListedInToolShelf("New Dataset").should("be.visible")
  })
  it("will open a graph", () => {
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile().should("be.visible")
    // graphs with no associated data set should not have a title but show a blank space when hovered
    c.getComponentTitle("graph").should("not.be.visible")
    c.getComponentTitleBar("graph").trigger("mouseover")
    c.getComponentTitle("graph").should("have.text", "_____")
  })
  it("will open a map", () => {
    c.clickIconFromToolShelf("map")
    map.getMapTile().should("be.visible")
    c.getComponentTitle("map").should("have.text", "Map")
  })
  it("will open a slider", () => {
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
  })
  it("will open a calculator", () => {
    c.clickIconFromToolShelf("calc")
    calculator.getCalculatorTile().should("be.visible")
    c.getComponentTitle("calculator").should("have.text", "Calculator")
  })
  it("plugin menu works", () => {
    c.getIconFromToolShelf("plugins").should("exist").click()
    toolbar.getPluginSelection().should("have.length", 9)
    webView.getTitle().should("not.exist")
    toolbar.getPluginSelection().eq(0).click()
    webView.getTitle().should("have.text", "Sampler")
    toolbar.getPluginSelection().should("not.exist")
  })
  it('will display a webpage', ()=>{
      const url='https://www.wikipedia.org'
      const url2='https://en.wikipedia.org/wiki/Concord_Consortium'
      toolbar.getOptionsButton().click()
      toolbar.getWebViewButton().click()
      webView.getUrlModal().should("exist")
      webView.enterUrl(url)
      cy.wait(1500)
      webView.getUrlModal().should("not.exist")
      webView.getIFrame().find(`.central-textlogo`).should("be.visible")
      webView.getEditUrlButton().click()
      webView.getUrlModal().should("exist")
      webView.enterUrl(url2)
      cy.wait(1500)
      webView.getIFrame().find(`.mw-page-title-main`).should("contain.text", "Concord Consortium")
  })
  it('will show a list of open tiles when there is no data context', ()=>{
    // Don't open a table as this automatically creates a data context
    c.getIconFromToolShelf("graph").click()
    c.getIconFromToolShelf("map").click()
    c.getIconFromToolShelf("slider").click()
    c.getIconFromToolShelf("calc").click()
    c.getIconFromToolShelf("plugins").click()
    toolbar.getPluginSelection().eq(0).click()
    //TODO need to add check for Text component
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    toolbar.getTilesListMenuItem().should("have.length", 5)

    toolbar.getTilesListMenuItem().eq(0).should("have.text", "")
    toolbar.getTilesListMenuIcon().eq(0).should("have.class", "Graph")
    toolbar.getTilesListMenuItem().eq(1).should("have.text", "Map")
    toolbar.getTilesListMenuIcon().eq(1).should("have.class", "Map")
    toolbar.getTilesListMenuItem().eq(2).should("have.text", "v1")
    toolbar.getTilesListMenuIcon().eq(2).should("have.class", "CodapSlider")
    toolbar.getTilesListMenuItem().eq(3).should("have.text", "Calculator")
    toolbar.getTilesListMenuIcon().eq(3).should("have.class", "Calculator")
    toolbar.getTilesListMenuItem().eq(4).should("have.text", "Sampler")
    toolbar.getTilesListMenuIcon().eq(4).should("have.class", "WebView")
  })
  it('will show correct title for a new table', ()=>{
    c.getIconFromToolShelf("table").click()
    toolbar.getNewCaseTable().click()
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    toolbar.getTilesListMenuItem().should("have.length", 1)
    toolbar.getTilesListMenuItem().eq(0).should("have.text", "New Dataset")
    toolbar.getTilesListMenuIcon().eq(0).should("have.class", "CaseTable")
  })
  it('will show a list of open tiles when there is a data context', ()=>{
    cy.visit("#file=examples:Four%20Seals")
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    toolbar.getTilesListMenuItem().should("have.length", 4)
    toolbar.getTilesListMenuItem().eq(0).should("have.text", "Tracks/Measurements")
    toolbar.getTilesListMenuItem().eq(1).should("have.text", "Measurements")
    toolbar.getTilesListMenuItem().eq(2).should("have.text", "Measurements")
    toolbar.getTilesListMenuItem().eq(3).should("have.text", "Getting Started")
  })
  it('will show the help pages list', ()=>{
    cy.visit("#file=examples:Four%20Seals")
    c.getIconFromToolShelf("help").click()
    toolbar.getHelpMenu().should("be.visible")
    toolbar.getHelpMenuItem("help").should("contains.text", "Help Pages and Videos")
    toolbar.getHelpMenuItem("forum").should("contains.text", "Help Forum")
    toolbar.getHelpMenuItem("project").should("contains.text", "The CODAP Project")
    toolbar.getHelpMenuItem("privacy").should("contains.text", "Privacy Page")
  })
})

context("Help Pages", () => {
  beforeEach(() => {
    cy.visit("#file=examples:Four%20Seals")
    cy.window().then((win) => {
      cy.stub(win, "open").as("windowOpen")
    })
  })
  it('will open the help page', ()=>{
    c.getIconFromToolShelf("help").click()
    toolbar.getHelpMenuItem("help").click()
    cy.get('@windowOpen').should('have.been.calledWith', helpURL)
  })
  it('will open the forum page', ()=>{
    c.getIconFromToolShelf("help").click()
    toolbar.getHelpMenuItem("forum").click()
    cy.get('@windowOpen').should('have.been.calledWith', helpForumURL)
  })
  it('will open the project website', ()=>{
    c.getIconFromToolShelf("help").click()
    toolbar.getHelpMenuItem("project").click()
    cy.get('@windowOpen').should('have.been.calledWith', projectWebSiteURL)
  })
  it('will open the privacy policy page', ()=>{
    c.getIconFromToolShelf("help").click()
    toolbar.getHelpMenuItem("privacy").click()
    cy.get('@windowOpen').should('have.been.calledWith', privacyURL)
  })
  //TODO need to add test for the translated help page
})
