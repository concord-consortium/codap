import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { ComponentElements as c } from "../support/elements/component-elements"

const collectionName = "Mammals"
const newCollectionName = "Animals"
// const newGraphName = "New Dataset"
const arrayOfPlots = [
  { attribute: "Mammal", axis: "x", collection: "mammals" },
  { attribute: "Order", axis: "y", collection: "mammals" },
  { attribute: "LifeSpan", axis: "x1", collection: "mammals" },
  { attribute: "Height", axis: "y1", collection: "mammals" },
  { attribute: "Mass", axis: "x", collection: "mammals" },
  { attribute: "Sleep", axis: "y", collection: "mammals" },
  { attribute: "Speed", axis: "x1", collection: "mammals" },
  { attribute: "Habitat", axis: "graph_plot", collection: "mammals" },
  { attribute: "Diet", axis: "graph_plot", collection: "mammals" }
]

context("Test graph plot transitions", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("populates title bar from sample data", () => {
    c.getComponentTitle("graph").should("contain", collectionName)
  })
  it("will add attributes to a graph and verify plot transitions are correct", () => {
    cy.wrap(arrayOfPlots).each((hash, index, list) => {
      cy.dragAttributeToTarget("table", hash.attribute, hash.axis)
      cy.wait(2000)
    })
  })
})

context("Graph UI", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })

  it("updates graph title", () => {
    c.getComponentTitle("graph").should("have.text", collectionName)
    c.changeComponentTitle("graph", newCollectionName)
    c.getComponentTitle("graph").should("have.text", newCollectionName)
  })
  it("creates graphs with new collection name", () => {
    c.createFromToolshelf("graph")

    c.getComponentTitle("graph").should("contain", collectionName)
    c.getComponentTitle("graph", 1).should("contain", collectionName)

    c.createFromToolshelf("graph")
    c.getComponentTitle("graph", 2).should("contain", collectionName)
  })
  it("creates graphs with new collection names when existing ones are closed", () => {
    c.closeComponent("graph")
    c.checkComponentDoesNotExist("graph")
    c.createFromToolshelf("graph")
    c.getComponentTitle("graph").should("contain", collectionName)

    c.closeComponent("graph")
    c.checkComponentDoesNotExist("graph")
    c.createFromToolshelf("graph")
    c.getComponentTitle("graph").should("contain", collectionName)
  })
  it("checks all graph tooltips", () => {
    c.selectTile("graph", 0)
    c.getToolShelfIcon("graph").then($element => {
      c.checkToolTip($element, c.tooltips.graphToolShelfIcon)
    })
    c.getMinimizeButton("graph").then($element => {
      c.checkToolTip($element, c.tooltips.minimizeComponent)
    })
    c.getCloseButton("graph").then($element => {
      c.checkToolTip($element, c.tooltips.closeComponent)
    })
    graph.getResizeIcon().then($element => {
      c.checkToolTip($element, c.tooltips.graphResizeButton)
    })
    graph.getHideShowButton().then($element => {
      c.checkToolTip($element, c.tooltips.graphHideShowButton)
    })
    graph.getDisplayValuesButton().then($element => {
      c.checkToolTip($element, c.tooltips.graphDisplayValuesButton)
    })
    graph.getDisplayConfigButton().then($element => {
      c.checkToolTip($element, c.tooltips.graphDisplayConfigButton)
    })
    graph.getDisplayStylesButton().then($element => {
      c.checkToolTip($element, c.tooltips.graphDisplayStylesButton)
    })
    graph.getCameraButton().then($element => {
      c.checkToolTip($element, c.tooltips.graphCameraButton)
    })
  })
})

context("Graph adornments", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })

  it("shows inspector palette when Display Values button is clicked", () => {
    c.selectTile("graph", 0)
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
  })
  it("adds a movable line to the graph when the Movable Line checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    cy.dragAttributeToTarget("table", "Speed", "y")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const movableLineCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-movable-line]")
    movableLineCheckbox.should("be.visible")
    movableLineCheckbox.click()
    cy.get(".graph-adornments-grid").should("exist")
    cy.get(".graph-adornments-grid").find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get(".graph-adornments-grid").find("[data-testid=movable-line]").should("exist")
    cy.get(".graph-adornments-grid").find("[data-testid=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]").should("not.be.empty")
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple lines)
    // TODO: Test dragging of line and equation value changes
    // TODO: Test unpinning equation box from line
    cy.wait(250)
    movableLineCheckbox.click()
    cy.get(".graph-adornments-grid").should("not.exist")
  })

})
