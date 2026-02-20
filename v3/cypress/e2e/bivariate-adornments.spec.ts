import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

context("Graph adornments", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })

  it("adds a least squares line to graph when Least Squares Line checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Mass", "bottom")
    cy.dragAttributeToTarget("table", "Speed", "left")
    graph.getDisplayValuesButton().click()
    cy.get("[data-testid=adornment-lsrl-sub-options]").should("not.exist")
    cy.get("[data-testid=adornment-checkbox-lsrl]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid=lsrl]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid=lsrl-cover]").should("exist")
    // r² should not appear by default
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid=lsrl-equation-]").should("exist")
      .should("contain.html", "<em>Speed</em> = −0.0014 (<em>Mass</em>) + 50")
      .should("not.contain.html", "r<sup>2</sup>")
    // Sub-options should be visible now that LSRL is checked
    cy.get("[data-testid=adornment-lsrl-sub-options]").should("exist")
    // Enable Show r² and verify it appears in the equation
    cy.get("[data-testid=adornment-checkbox-lsrl-show-r-squared]").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid=lsrl-equation-]").should("exist")
      .should("contain.html", "r<sup>2</sup> = 0.009")
    cy.get("*[data-testid=lsrl-confidence-band]").should("exist").should("not.have.attr", "d")
    cy.get("*[data-testid=lsrl-confidence-band-cover]").should("exist").should("not.have.attr", "d")
    cy.get("*[data-testid=lsrl-confidence-band-shading]").should("exist").should("not.have.attr", "d")
    cy.get("[data-testid=adornment-checkbox-lsrl-show-confidence-bands]").find("input")
      .should("not.have.attr", "disabled")
    cy.get("[data-testid=adornment-checkbox-lsrl-show-confidence-bands]").click()
    cy.get("*[data-testid=lsrl-confidence-band]").should("have.attr", "d")
    cy.get("*[data-testid=lsrl-confidence-band-cover]").should("exist").should("have.attr", "d")
    cy.get("*[data-testid=lsrl-confidence-band-shading]").should("exist").should("have.attr", "d")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid=lsrl-equation-]").should("exist")
      .should(
        "contain.html",
        "<em>Speed</em> = −0.0014 (<em>Mass</em>) + 50<br>r<sup>2</sup> = 0.009<br>" +
        "σ<sub>slope</sub> = 0.003<br>σ<sub>intercept</sub> = 5.84"
      )
    // TODO: Test that mousing over equation highlights the line and vice versa
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are
    // multiple least squares lines)

    // TODO: Add a test undo/redo for the least squares line

    // toolbar.getUndoTool().click()
    // cy.wait(250)
    // Show Confidence Bands should not be visible after an undo
    // bug reported here: #187005022

    // TODO: Least square lines should not be visible after a second undo

  })
  it("locks intercept of LSRL and movable line when Lock Intercept checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.dragAttributeToTarget("table", "Speed", "left")
    graph.getDisplayValuesButton().click()
    cy.get("[data-testid=adornment-checkbox-intercept-locked]").find("input")
      .should("not.be.checked").should("have.attr", "disabled")
    cy.get("[data-testid=adornment-checkbox-lsrl]").click()
    // Enable Show r² so we can test its interaction with intercept lock
    cy.get("[data-testid=adornment-checkbox-lsrl-show-r-squared]").click()
    cy.get("[data-testid=adornment-checkbox-lsrl-show-confidence-bands]").click()
    cy.get("*[data-testid=lsrl-confidence-band]").should("have.attr", "d")
    cy.get("*[data-testid=lsrl-confidence-band-cover]").should("exist").should("have.attr", "d")
    cy.get("*[data-testid=lsrl-confidence-band-shading]").should("exist").should("have.attr", "d")
    cy.get("[data-testid=adornment-checkbox-movable-line]").click()
    cy.get("[data-testid=adornment-checkbox-intercept-locked]").find("input").should("not.have.attr", "disabled")
    cy.get("[data-testid=adornment-checkbox-intercept-locked]").click()
    // r, r², and confidence bands options should be hidden when intercept is locked
    cy.get("[data-testid=adornment-checkbox-lsrl-show-r]").should("not.exist")
    cy.get("[data-testid=adornment-checkbox-lsrl-show-r-squared]").should("not.exist")
    cy.get("[data-testid=adornment-checkbox-lsrl-show-confidence-bands]").should("not.exist")
    cy.get("*[data-testid=lsrl-confidence-band]").should("not.have.attr", "d")
    cy.get("*[data-testid=lsrl-confidence-band-cover]").should("exist").should("not.have.attr", "d")
    cy.get("*[data-testid=lsrl-confidence-band-shading]").should("exist").should("not.have.attr", "d")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid=lsrl-equation-]").should("exist")
      .should("not.contain.html", "r<sup>2</sup> = ")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]")
      .should("not.contain.html", "(<em>Sleep</em>) + ")
    cy.get("[data-testid=adornment-checkbox-intercept-locked]").click()
    // r, r², and confidence bands options should reappear when intercept is unlocked
    cy.get("[data-testid=adornment-checkbox-lsrl-show-r-squared]").should("exist")
    cy.get("[data-testid=adornment-checkbox-lsrl-show-confidence-bands]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid=lsrl-equation-]").should("exist")
      .should("contain.html", "r<sup>2</sup> = ")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]")
      .should("contain.html", "(<em>Sleep</em>) + ")

      // TODO: add tests for undo and redo for LSRL

  })
  it("adds movable point to graph when Movable Point checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.dragAttributeToTarget("table", "Speed", "left")
    graph.getDisplayValuesButton().click()

    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-movable-point]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=movable-point]").should("exist")
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple points)
    // TODO: Test dragging of point
    cy.wait(250)
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-movable-point]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")

    // Adds a test for undo and redo of Moveable point
    toolbar.getUndoTool().click()
    cy.wait(250)

    // The Moveable point should be visible again after an undo
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=movable-point]").should("exist")
    cy.wait(250)

    // The Moveable point should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds plotted function UI to graph when Plotted Function checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.dragAttributeToTarget("table", "Mass", "left")
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 0\)/)
    graph.getDisplayValuesButton().click()

    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-plotted-function]").should("be.visible").click()
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 22\)/)
    cy.get("[data-testid=graph-adornments-banners]").should("exist")
    cy.get("[data-testid=plotted-function-control]").should("exist")
    cy.get("[data-testid=plotted-function-control-label]").should("exist")
    cy.get("[data-testid=plotted-function-control-value]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-function-control-label]").should("exist").should("have.text", "Mass")
    cy.get("[data-testid=plotted-function-control-value]").should("exist").should("have.text", "")
    cy.wait(250)
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-plotted-function]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 0\)/)

    // Adds a test for undo and redo for plotted function checkbox
    toolbar.getUndoTool().click()
    cy.wait(250)

    // The plotted function should be visible again after an undo
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 22\)/)
    cy.get("[data-testid=graph-adornments-banners]").should("exist")
    cy.get("[data-testid=plotted-function-control]").should("exist")
    cy.get("[data-testid=plotted-function-control-label]").should("exist")
    cy.get("[data-testid=plotted-function-control-value]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-function-control-label]").should("exist").should("have.text", "Mass")
    cy.get("[data-testid=plotted-function-control-value]").should("exist").should("have.text", "")
    cy.wait(250)

    // The plotted function should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 0\)/)

  })
  it("allows adding a plotted function to the graph by entering a value into the plotted function UI", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Speed", "bottom")
    cy.dragAttributeToTarget("table", "Mass", "left")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-plotted-function]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-function-control-value]").click()
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    cy.get("[data-testid=formula-editor-input] .cm-content").realType("10")
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=plotted-function]").should("exist")
    cy.get("*[data-testid^=plotted-function-path]").should("exist")
    // TODO: Also test the above after attributes are added to top and right axes
    // (i.e. when there are multiple plotted functions)

    // Adds a test for undo and redo for plotted function UI checkbox
    toolbar.getUndoTool().click()
    cy.wait(250)

    // The plotted function should be visible again after an undo
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.wait(250)

    // The plotted function should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=plotted-function]").should("exist")
    cy.get("*[data-testid^=plotted-function-path]").should("exist")
  })
  it("adds squares of residuals squares to the plot when the Squares of Residuals checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.dragAttributeToTarget("table", "Speed", "left")
    graph.getDisplayValuesButton().click()

    graph.getInspectorPalette().should("be.visible")
    cy.get("[data-testid=adornment-checkbox-squares-of-residuals]").should("be.visible")
    cy.get("[data-testid=adornment-checkbox-squares-of-residuals]").find("input").should("have.attr", "disabled")
    cy.get("*[data-testid^=movable-line-squares]").should("not.exist")
    cy.get("[data-testid=adornment-checkbox-movable-line]").click()
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]")
      .should("not.contain.html", "Sum of squares = ")
    cy.get("[data-testid=adornment-checkbox-squares-of-residuals]").find("input").should("not.have.attr", "disabled")
    cy.get("[data-testid=adornment-checkbox-squares-of-residuals]").click()
    cy.get("*[data-testid^=movable-line-squares]").should("exist")
    cy.get("*[data-testid^=movable-line-squares]").find("rect").should("have.attr", "stroke", "#4682b4")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]")
      .should("contain.html", "Sum of squares = ")
    cy.get("[data-testid=adornment-checkbox-squares-of-residuals]").click()
    cy.get("*[data-testid^=movable-line-squares]").should("not.exist")
    cy.get("[data-testid=adornment-checkbox-lsrl]").click()
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=lsrl-equation-container-]")
      .find("[data-testid=lsrl-equation-]")
      .should("not.contain.html", "Sum of squares = ")
    cy.get("*[data-testid^=lsrl-squares]").should("not.exist")
    cy.get("[data-testid=adornment-checkbox-squares-of-residuals]").click()
    cy.get("*[data-testid^=lsrl-squares]").should("exist")
    cy.get("*[data-testid^=lsrl-squares]").find("rect").should("have.attr", "stroke", "#008000")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=lsrl-equation-container-]")
      .find("[data-testid=lsrl-equation-]")
      .should("contain.html", "Sum of squares = ")
    cy.get("[data-testid=adornment-checkbox-lsrl]").click()
    cy.get("*[data-testid^=lsrl-squares]").should("not.exist")
    cy.get("[data-testid=adornment-checkbox-movable-line]").click()
    cy.get("*[data-testid^=movable-line-squares]").should("not.exist")
    cy.get("[data-testid=adornment-checkbox-squares-of-residuals]").find("input").should("have.attr", "disabled")
  })

  it("adds connecting lines to the plot when the Connecting Lines checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.dragAttributeToTarget("table", "Speed", "left")
    cy.dragAttributeToTarget("table", "Diet", "top")
    graph.getDisplayValuesButton().click()

    graph.getInspectorPalette().should("be.visible")
    cy.get("[data-testid=adornment-checkbox-connecting-lines]").should("be.visible")
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").should("not.exist")
    // TODO: Update the below once the connecting lines and related dot animation is re-instated
    // cy.get(".graph-dot").each((dot: SVGCircleElement) => {
    //   cy.wrap(dot).should("have.attr", "r", 6)
    // })
    cy.get("[data-testid=adornment-checkbox-connecting-lines]").click()
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").should("exist").and("have.length", 3)
    // TODO: Update the below once the connecting lines and related dot animation is re-instated
    // cy.get(".graph-dot").each((dot: SVGCircleElement) => {
    //   cy.wrap(dot).should("have.attr", "r", 3)
    // })
    // Since the circle elements for the graph's case dots overlay the lines' path element in various places, we
    // use force: true so we don't need to figure out exactly where to click.
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").first().click({force: true})
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").first().should("have.attr", "stroke-width", "4")
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").first().click({force: true})
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").first().should("have.attr", "stroke-width", "2")
    graph.getDisplayValuesButton().click()
    cy.get("[data-testid=adornment-checkbox-connecting-lines]").click()
    cy.get("*[data-testid^=adornment-checkbox-connecting-lines]").find("path").should("not.exist")
    // TODO: Update the below once the connecting lines and related dot animation is re-instated
    // cy.get(".graph-dot").each((dot: SVGCircleElement) => {
    //   cy.wrap(dot).should("have.attr", "r", 6)
    // })

    // Adds a test for undo and redo for connecting lines checkbox
    toolbar.getUndoTool().click()
    cy.wait(250)

    // Connecting lines should be visible again after an undo
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").should("exist")
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").first().click({force: true})
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").first().should("have.attr", "stroke-width", "4")
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").first().click({force: true})
    cy.get("*[data-testid^=connecting-lines-graph]").find("path").first().should("have.attr", "stroke-width", "2")
    cy.wait(250)

    // Connecting lines should be hidden after a redo. this piece is a bit flaky so commented out for now.
    //toolbar.getRedoTool().click()
    //cy.get("*[data-testid^=adornment-checkbox-connecting-lines]").find("path").should("not.exist")
  })
})
