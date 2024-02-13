import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { TableTileElements as table } from "../support/elements/table-tile"
import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { MapTileElements as map } from "../support/elements/map-tile"
import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { CalculatorTileElements as calculator } from "../support/elements/calculator-tile"
import { WebViewTileElements } from "../support/elements/web-view-tile"

context("codap toolbar", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
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
    c.getComponentTitle("graph").should("have.text", "New Dataset")
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
  it('will display a webpage', ()=>{
      const url='https://www.wikipedia.org'
      let deleteUrl = ""
      for (let i = 0; i < url.length; i++) deleteUrl += "{backspace}"
      const url2=`${deleteUrl}https://en.wikipedia.org/wiki/Concord_Consortium`
      toolbar.getOptionsButton().click()
      toolbar.getWebViewButton().click()
      WebViewTileElements.getUrlModal().should("exist")
      WebViewTileElements.enterUrl(url)
      cy.wait(1000)
      WebViewTileElements.getUrlModal().should("not.exist")
      WebViewTileElements.getIFrame().find(`.central-textlogo`).should("be.visible")
      WebViewTileElements.getEditUrlButton().click()
      WebViewTileElements.getUrlModal().should("exist")
      WebViewTileElements.enterUrl(url2)
      cy.wait(1000)
      WebViewTileElements.getIFrame().find(`.mw-page-title-main`).should("contain.text", "Concord Consortium")
  })
})
