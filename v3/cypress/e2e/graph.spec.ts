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
  it("hides and shows selected/unselected cases", () => {
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.wait(500)
    // TODO: Add more thorough checks to make sure the cases are actually hidden and shown once Cypress is 
    // configured to interact with the PixiJS canvas. For now, we just check that the buttons are disabled
    // and enabled as expected.
    graph.getHideShowButton().click()
    cy.get("[data-testid=hide-selected-cases]").should("be.disabled")
    cy.get("[data-testid=hide-unselected-cases]").should("not.be.disabled")
    cy.get("[data-testid=show-all-cases]").should("be.disabled")
    cy.get("[data-testid=hide-unselected-cases]").click()
    cy.wait(500)
    graph.getHideShowButton().click()
    cy.get("[data-testid=hide-selected-cases]").should("be.disabled")
    cy.get("[data-testid=hide-unselected-cases]").should("be.disabled")
    cy.get("[data-testid=show-all-cases]").should("not.be.disabled")
    cy.get("[data-testid=show-all-cases]").click()
    cy.wait(500)
    graph.getHideShowButton().click()
    cy.get("[data-testid=hide-selected-cases]").should("be.disabled")
    cy.get("[data-testid=hide-unselected-cases]").should("not.be.disabled")
    cy.get("[data-testid=show-all-cases]").should("be.disabled")
  })
  it("displays only selected cases and adjusts axes when 'Display Only Selected Cases' is selected", () => {
    // TODO: Add more thorough checks to make sure cases are actually hidden and shown, and the axes adjust
    // once Cypress is configured to interact with the PixiJS canvas. For now, we just check that the buttons
    // are disabled and enabled as expected.
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.wait(500)
    graph.getHideShowButton().click()
    cy.get("[data-testid=display-selected-cases]").should("not.be.disabled")
    cy.get("[data-testid=show-all-cases]").should("be.disabled")
    cy.get("[data-testid=display-selected-cases]").click()
    cy.wait(500)
    graph.getHideShowButton().click()
    cy.get("[data-testid=display-selected-cases]").should("be.disabled")
    cy.get("[data-testid=show-all-cases]").should("not.be.disabled")
    cy.get("[data-testid=show-all-cases]").click()
    cy.wait(500)
    graph.getHideShowButton().click()
    cy.get("[data-testid=display-selected-cases]").should("not.be.disabled")
    cy.get("[data-testid=show-all-cases]").should("be.disabled")
  })
  it("shows a warning when 'Display Only Selected Cases' is selected and no cases have been selected", () => {
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.wait(500)
    cy.get("[data-testid=display-only-selected-warning]").should("not.exist")
    graph.getHideShowButton().click()
    cy.get("[data-testid=display-selected-cases]").click()
    // The warning is made up of six individual strings rendered in their own separate text elements
    cy.get("[data-testid=display-only-selected-warning]").should("exist").and("have.length", 6)
    graph.getHideShowButton().click()
    // Resorting to using force: true because the option's parent is reported as hidden in CI but not locally.
    cy.get("[data-testid=show-all-cases]").click({force: true})
    cy.get("[data-testid=display-only-selected-warning]").should("not.exist")
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
    cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary").should("have.length", 9)
    cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").should("have.length", 9)
    cy.get("[data-testid=graph-bin-width-setting]").find("input").should("exist").should("have.value", "2")
    cy.get("[data-testid=graph-bin-width-setting]").find("input").clear().type("5")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("exist").should("have.value", "2")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").clear().type("3")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").type("{enter}")
    cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary").should("have.length", 4)
    cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").should("have.length", 4)
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
    cy.get("[data-testid=graph-bin-width-setting]").find("input").should("have.value", "20")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("have.value", "0")
  })
  it("allows user to change bin width and alignment values by dragging the bin boundary lines", () => {
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=bins-radio-button]").click()
    cy.wait(500)
    cy.get("[data-testid=bin-ticks-graph-1]").should("exist")
    cy.get("[data-testid=graph-bin-width-setting]").find("input").should("exist").should("have.value", "2")
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("exist").should("have.value", "2")
    // focus on the plot area
    cy.get("[data-testid=bin-ticks-graph-1]").click()
    cy.window().then((win: Window) => {
      cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").eq(2)
        .trigger("mousedown", { which: 1, force: true, view: win })
      cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").eq(2)
        .trigger("mousemove", 20, 0, { force: true })
      cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").eq(2)
        .trigger("mouseup", { force: true, view: win })
    })
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=graph-bin-width-setting]").find("input").invoke("val").then((valueStr: string) => {
      const valueNum = parseFloat(valueStr)
      expect(valueNum).to.be.closeTo(2.75, 0.25)
    })
    cy.get("[data-testid=graph-bin-alignment-setting]").find("input").invoke("val").then((valueStr: string) => {
      const valueNum = parseFloat(valueStr)
      expect(valueNum).to.be.closeTo(4, 0.1)
    })
  })
  it("shows a bar graph when there's one categorical attr on primary axis and 'Fuse Dots into Bars' is checked", () => {
    cy.dragAttributeToTarget("table", "Habitat", "bottom")
    cy.get("[data-testid=bar-cover]").should("not.exist")
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=bar-chart-checkbox]").find("input").should("exist").and("have.attr", "type", "checkbox")
      .and("not.be.checked")
    cy.get("[data-testid=bar-chart-checkbox]").click()
    cy.get("[data-testid=bar-chart-checkbox]").find("input").should("be.checked")
    // TODO: It would be better to check for the exact number of bars, but the number seems to vary depending on whether
    // you're running the test locally or in CI for some mysterious reason.
    // cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 3)
    cy.get("[data-testid=bar-cover]").should("exist")
    cy.get(".axis-wrapper.left").find("[data-testid=attribute-label]").should("exist").and("have.text", "Count")
    cy.get("[data-testid=case-table]").find("[role=row][aria-selected=true]").should("not.exist")
    cy.get("[data-testid=bar-cover]").eq(1).click()
    cy.get("[data-testid=case-table]").find("[role=row][aria-selected=true]").should("have.length.greaterThan", 0)
    // TODO: Enable these checks once the number of bars is consistent. See comment above.
    // cy.get("[data-testid=case-table]").find("[role=row][aria-selected=true]").should("have.length", 2)
    // cy.get("[data-testid=bar-cover]").eq(2).click({ shiftKey: true })
    // cy.get("[data-testid=case-table]").find("[role=row][aria-selected=true]").should("have.length", 3)
    cy.dragAttributeToTarget("table", "Diet", "top")
    // TODO: See comment above regarding number of bars.
    // cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 9)
    cy.get("[data-testid=bar-cover]").should("exist")
    cy.get("[data-testid=axis-legend-attribute-button-top").click()
    cy.get("[role=menuitem]").contains("Remove Side-by-side Layout by Diet").click()
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=bar-chart-checkbox]").click()
    cy.get("[data-testid=bar-chart-checkbox]").find("input").should("not.be.checked")
    cy.get("[data-testid=bar-cover]").should("not.exist")
    cy.get(".axis-wrapper.left").find("[data-testid=attribute-label]").should("not.exist")
    cy.get("[data-testid=bar-chart-checkbox]").click()
    cy.get(".axis-wrapper.left").find("[data-testid=attribute-label]").should("exist").and("have.text", "Count")
    // TODO: See comment above regarding number of bars.
    // cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 3)
    cy.get("[data-testid=bar-cover]").should("exist")
    cy.dragAttributeToTarget("table", "Sleep", "left")
    cy.get(".axis-wrapper.left").find("[data-testid=attribute-label]").should("exist").and("have.text", "Sleep")
    cy.get("[data-testid=bar-cover]").should("not.exist")
  })
})
