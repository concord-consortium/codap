import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { TableTileElements as table } from "../support/elements/table-tile"
import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { MapTileElements as map } from "../support/elements/map-tile"
import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { CalculatorTileElements as calculator } from "../support/elements/calculator-tile"

context("codap toolbar", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
  })
  it("will open a new table", () => {
    c.clickIconFromToolshelf("table")
    toolbar.getNewCaseTable().click()
    table.getCollection().should("be.visible");
    c.getComponentTitle("table").should("have.text", "New Dataset")
    c.clickIconFromToolshelf("table")
    toolbar.getDatasetListedInToolshelf("New Dataset").should("be.visible")
  })
  it("will open a new table", () => {
    c.clickIconFromToolshelf("table")
    toolbar.getNewCaseTable().click()
    table.getCollection().should("be.visible");
    c.getComponentTitle("table").should("have.text", "New Dataset")
  })
  it("will open a graph", () => {
    c.clickIconFromToolshelf("graph")
    graph.getGraphTile().should("be.visible")
    c.getComponentTitle("graph").should("have.text", "New Dataset")
  })
  it("will open a map", () => {
    c.clickIconFromToolshelf("map")
    map.getMapTile().should("be.visible");
    c.getComponentTitle("map").should("have.text", "Map")
  })
  it("will open a slider", () => {
    c.clickIconFromToolshelf("slider")
    slider.getSliderTile().should("be.visible");
    c.getComponentTitle("slider").should("have.text", "v1")
  })
  it("will open a calculator", () => {
    c.clickIconFromToolshelf("calculator")
    calculator.getCalculatorTile().should("be.visible");
    c.getComponentTitle("calculator").should("have.text", "Calculator")
  })
  it("will delete an existing table", () => {
    c.clickIconFromToolshelf("table")
    toolbar.getNewCaseTable().click()
    c.clickIconFromToolshelf("table")
    toolbar.getDatasetListedInToolshelf("New Dataset").should("be.visible")
    toolbar.getDeleteCaseTable("New Dataset").click()
    toolbar.getConfirmDeleteDatasetModal().click()
  })
})
