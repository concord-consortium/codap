import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { CfmElements as cfm } from "../support/elements/cfm"
import graphRules from '../fixtures/graph-rules.json'

const collectionName = "Mammals"
const newCollectionName = "Animals"
const plots = graphRules.plots

context("Test graph plot transitions", () => {
  beforeEach(function () {
    const queryParams = "?mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cfm.openLocalDoc("cypress/fixtures/3TableGroups.codap")
    cy.wait(2500)
  })

  // Skipping this test because Cypress 13 does not support displaying pixijs canvas elements in CI
  // https://github.com/cypress-io/cypress/issues/28289
  // This test can be unskipped when the above cypress bug is resolved
  // (In local, this works fine and the tests can be run successfully)
  plots.forEach(test => {
    it.skip(`${test.testName}`, () => {
      c.getIconFromToolshelf("graph").click()
      c.moveComponent("graph", 1000)
      test.axes.forEach(hash => {
        hash.checks.forEach(check => {
          cy.checkDragAttributeHighlights("table", hash.attribute, check.axis, check.active)
        })
        cy.dragAttributeToTarget("table", hash.attribute, hash.target)
        cy.wait(2000)
      })
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

    // test for undo/redo when updating graph title
    toolbar.getUndoTool().click()
    c.changeComponentTitle("graph", newCollectionName)
    c.getComponentTitle("graph").should("have.text", newCollectionName)
    // TODO: add a check after undo to make sure the title has reverted to
    // the Collection Name. Blocker: PT #187033159

    // use force:true so we don't have to worry about redo disabling
    toolbar.getRedoTool().click({force: true})
    c.changeComponentTitle("graph", newCollectionName)
    c.getComponentTitle("graph").should("have.text", newCollectionName)
    // TODO: add a check after undo to make sure the title has reverted to
    // the Collection Name. Blocker: PT #187033159

  })
  it("tests undo/redo of creating graphs", () => {

    // Function to count CODAP graphs and return the count
    const countCodapGraphs = () => {
      return cy.get('.codap-graph').its('length')
    }
    countCodapGraphs().then((initialCount: number) => {
      cy.log(`Initial CODAP Graph Count: ${initialCount}`)

      // perform an action that gets a new graph
      c.getIconFromToolshelf("graph").click()
      // cy.wait(1000)
      c.getComponentTitle("graph").should("contain", collectionName)
      c.getComponentTitle("graph", 1).should("contain", collectionName)
      // Assert the count increased by 1
      countCodapGraphs().should('eq', initialCount + 1)

      // tests for undo after creating a graph
      toolbar.getUndoTool().click()
      // cy.wait(1000)
      // Assert the count decreased by 1
      countCodapGraphs().should('eq', initialCount)

      // tests for redo of creating a graph
      toolbar.getRedoTool().click()
      // cy.wait(1000)
      // Assert the count decreased by 1
      countCodapGraphs().should('eq', initialCount + 1)
    })
  })
  it("creates graphs with new collection names when existing ones are closed", () => {
    c.closeComponent("graph")
    c.checkComponentDoesNotExist("graph")
    c.getIconFromToolshelf("graph").click()
    c.getComponentTitle("graph").should("contain", collectionName)

    c.closeComponent("graph")
    c.checkComponentDoesNotExist("graph")
    c.getIconFromToolshelf("graph").click()
    c.getComponentTitle("graph").should("contain", collectionName)
  })
  it("checks all graph tooltips", () => {
    c.selectTile("graph", 0)
    toolbar.getToolShelfIcon("graph").then($element => {
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
    graph.getDisplayStylesButton().then($element => {
      c.checkToolTip($element, c.tooltips.graphDisplayStylesButton)
    })
    graph.getCameraButton().then($element => {
      c.checkToolTip($element, c.tooltips.graphCameraButton)
    })
    // The display config button should not appear until the graph is configured to have a univariate plot,
    // i.e. there is a single numeric attribute on either the bottom or left axis.
    graph.getDisplayConfigButton().should("not.exist")
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.wait(500)
    graph.getDisplayConfigButton().should("exist")
    graph.getDisplayConfigButton().then($element => {
      c.checkToolTip($element, c.tooltips.graphDisplayConfigButton)
    })
    cy.dragAttributeToTarget("table", "Speed", "left")
    cy.wait(500)
    graph.getDisplayConfigButton().should("not.exist")
  })
  it("disables Point Size control when display type is bars", () => {
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.wait(500)
    graph.getDisplayStylesButton().click()
    cy.get("[data-testid=point-size-slider]").should("not.have.attr", "aria-disabled")
    graph.getDisplayConfigButton().click()
    cy.wait(500)
    cy.get("[data-testid=bars-radio-button]").click()
    cy.wait(500)
    graph.getDisplayStylesButton().click()
    cy.get("[data-testid=point-size-slider]").should("have.attr", "aria-disabled", "true")
  })
  it("adds bin boundaries to plot when 'Group into Bins' is selected", () => {
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.wait(500)
    cy.get("[data-testid=bin-ticks-graph-1]").should("not.exist")
    graph.getDisplayConfigButton().click()
    cy.wait(500)
    cy.get("[data-testid=bins-radio-button]").click()
    cy.wait(500)
    cy.get("[data-testid=bin-ticks-graph-1]").should("exist")
  })
  it("enables bin width and alignment options when 'Group into Bins' is selected", () => {
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=graph-bin-width-setting]").should("not.exist")
    cy.get("[data-testid=graph-bin-alignment-setting]").should("not.exist")
    cy.get("[data-testid=bins-radio-button]").click()
    cy.wait(500)
    cy.get("[data-testid=graph-bin-width-setting]").should("exist")
    cy.get("[data-testid=graph-bin-width-setting]").find("label").should("exist").and("have.text", "Bin width")
    cy.get("[data-testid=graph-bin-width-setting]").find("input").should("exist").should("have.value", "2")
    cy.get("[data-testid=graph-bin-alignment-setting]").should("exist")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("label").should("exist").and("have.text", "Alignment")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("exist").should("have.value", "2")
  })
  it("updates bin configuration when bin width and bin alignment values are changed", () => {
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=bins-radio-button]").click()
    cy.wait(500)
    cy.get("[data-testid=bin-ticks-graph-1]").should("exist")
    cy.get("[data-testid=bin-ticks-graph-1]").find("path").should("have.length", 11)
    cy.get("[data-testid=graph-bin-width-setting]").find("input").should("exist").should("have.value", "2")
    cy.get("[data-testid=graph-bin-width-setting]").find("input").clear().type("5")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("exist").should("have.value", "2")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").clear().type("3")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").type("{enter}")
    cy.get("[data-testid=bin-ticks-graph-1]").find("path").should("have.length", 6)
  })
  it("reverts bin width and bin alignment to default values for new value range when attribute is changed", () => {
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=bins-radio-button]").click()
    cy.wait(500)
    cy.get("[data-testid=bin-ticks-graph-1]").should("exist")
    cy.get("[data-testid=graph-bin-width-setting]").find("input").clear().type("5")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").clear().type("3")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").type("{enter}")
    cy.dragAttributeToTarget("table", "Speed", "bottom")
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=graph-bin-width-setting]").find("input").should("exist").should("have.value", "20")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("exist").should("have.value", "0")
  })
})
