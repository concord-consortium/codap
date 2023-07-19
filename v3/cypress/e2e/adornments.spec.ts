import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { ComponentElements as c } from "../support/elements/component-elements"

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
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "fadeIn")
    cy.get("[data-testid=adornment-wrapper]").find("[data-testid=movable-line]").should("exist")
    cy.get("[data-testid=adornment-wrapper]").find("[data-testid=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]").should("not.be.empty")
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple lines)
    // TODO: Test dragging of line and equation value changes
    // TODO: Test unpinning equation box from line
    cy.wait(250)
    movableLineCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "fadeOut")
  })
  it("adds a movable point to the graph when the Movable Point checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    cy.dragAttributeToTarget("table", "Speed", "y")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const movablePointCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-movable-point]")
    movablePointCheckbox.should("be.visible")
    movablePointCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "fadeIn")
    cy.get("[data-testid=graph-adornments-grid]").find("[data-testid=movable-point]").should("exist")
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple points)
    // TODO: Test dragging of point
    cy.wait(250)
    movablePointCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "fadeOut")
  })

})
