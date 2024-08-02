import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { TableTileElements as table } from "../support/elements/table-tile"
import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { MapTileElements as map } from "../support/elements/map-tile"
import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { CalculatorTileElements as calculator } from "../support/elements/calculator-tile"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

context("codap toolbar", () => {
  beforeEach(function () {
    cy.log('Starting test setup')
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
    cy.log('Setup complete')
  })
  it("will open a new table", () => {
    c.getIconFromToolshelf("table").click()
    toolbar.getNewCaseTable().click()
    table.getCollection().should("be.visible")
    c.getComponentTitle("table").should("have.text", "New Dataset")
    c.getIconFromToolshelf("table").click()
    toolbar.getDatasetListedInToolshelf("New Dataset").should("be.visible")
  })
  it("will open a graph", () => {
    c.getIconFromToolshelf("graph").click()
    graph.getGraphTile().should("be.visible")
    // graphs with no associated data set should not have a title
    c.getComponentTitle("graph").should("have.text", "")
  })
  it("will open a map", () => {
    c.getIconFromToolshelf("map").click()
    map.getMapTile().should("be.visible")
    c.getComponentTitle("map").should("have.text", "Map")
  })
  it("will open a slider", () => {
    c.getIconFromToolshelf("slider").click()
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
  })
  it("will open a calculator", () => {
    c.getIconFromToolshelf("calc").click()
    calculator.getCalculatorTile().should("be.visible")
    c.getComponentTitle("calculator").should("have.text", "Calculator")
  })
  it("plugin menu works", () => {
    c.getIconFromToolshelf("plugins").should("exist").click()
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
      cy.wait(1000)
      webView.getUrlModal().should("not.exist")
      webView.getIFrame().find(`.central-textlogo`).should("be.visible")
      webView.getEditUrlButton().click()
      webView.getUrlModal().should("exist")
      webView.enterUrl(url2)
      cy.wait(1000)
      webView.getIFrame().find(`.mw-page-title-main`).should("contain.text", "Concord Consortium")
  })
  it('will show a list of open tiles when there is no data context', ()=>{
    // Don't open a table as this automatically creates a data context
    c.getIconFromToolshelf("graph").click()
    c.getIconFromToolshelf("map").click()
    c.getIconFromToolshelf("slider").click()
    c.getIconFromToolshelf("calc").click()
    c.getIconFromToolshelf("plugins").click()
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
    c.getIconFromToolshelf("table").click()
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
    toolbar.getTilesListMenuItem().should("have.length", 3)
    toolbar.getTilesListMenuItem().eq(0).should("have.text", "Tracks/Measurements")
    toolbar.getTilesListMenuItem().eq(1).should("have.text", "Measurements")
    toolbar.getTilesListMenuItem().eq(2).should("have.text", "Measurements")
  })
})
