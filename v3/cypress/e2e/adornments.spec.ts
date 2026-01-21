import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { AxisElements as ae } from "../support/elements/axis-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { FormulaHelper as fh } from "../support/helpers/formula-helper"

const expectedPercents = [0, 100, 0, 37, 33, 29, 0, 100, 0]

context("Graph adornments", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })

  it("shows inspector palette when Display Values button is clicked", () => {
    c.selectTile("graph", 0)
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
  })
  it("adds a count to graph when Count checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.dragAttributeToTarget("table", "Speed", "left")

    // add undo/redo to this test
    toolbar.getUndoTool().click()
    ae.getAxisLabel("left").should("have.length", 0)
    toolbar.getRedoTool().click()
    ae.getAxisLabel("left").should("have.length", 1)

    // show the count adornment
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-count-count]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("have.text", "21")

    // add a filter formula
    graph.getHideShowButton().click()
    cy.get("[data-testid=hide-show-menu-list]").should("be.visible")
    cy.get("[data-testid=hide-show-menu-list]")
      .find("[data-testid=graph-edit-filter-formula]")
      .should("be.visible").click()
    fh.addFilterFormula(`Diet="meat"`)
    cy.get(".codap-modal-content [data-testid=Apply-button]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("have.text", "10")

    // change the filter formula
    graph.getHideShowButton().click()
    cy.get("[data-testid=hide-show-menu-list]").should("be.visible")
    cy.get("[data-testid=hide-show-menu-list]")
      .find("[data-testid=graph-edit-filter-formula]")
      .should("be.visible").click()
    fh.clearFormulaInput()
    fh.addFilterFormula(`Diet="plants"`)
    cy.get(".codap-modal-content [data-testid=Apply-button]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("have.text", "6")

    // delete the filter formula
    graph.getHideShowButton().click()
    cy.get("[data-testid=hide-show-menu-list]").should("be.visible")
    cy.get("[data-testid=hide-show-menu-list]")
      .find("[data-testid=graph-edit-filter-formula]")
      .should("be.visible").click()
    fh.clearFormulaInput()
    cy.get(".codap-modal-content [data-testid=Apply-button]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("have.text", "21")

    // hide the count adornment
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-count-count]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")

    // Undo hiding the adornment
    toolbar.getUndoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("have.text", "21")

    // Redo hiding the adornment
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("should add a percent to graph when Percent checkbox is checked with undo/redo", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Diet", "bottom")
    cy.dragAttributeToTarget("table", "Habitat", "left")

    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette()
      .find("[data-testid=adornment-checkbox-count-percent]")
      .should("be.visible")
      .click()

    // Wait for adornments to render
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 9)
    cy.get("[data-testid=adornment-wrapper]").each(($el) => {
      cy.wrap($el).should("have.class", "visible")
    })

    // Verify that at least one percent value is shown
    cy.get("[data-testid^=graph-count]").should("have.length.at.least", 1)
    cy.get("[data-testid^=graph-count]").first().should("contain.text", "%")

    // Verify the approximate values of the percentages
    cy.get("[data-testid^=graph-count]").should("have.length", expectedPercents.length)
    .each(($el, index) => {
      const expected = expectedPercents[index]
      cy.wrap($el).invoke("text").then(text => {
        const actual = parseFloat(text.replace("%", ""))
        expect(actual).to.be.closeTo(expected, 1)  // Tolerance of 1 is safe due to CODAP-359
      })
    })

    // Hide the percent values
    graph.getInspectorPalette()
      .find("[data-testid=adornment-checkbox-count-percent]")
      .click()
    cy.get("[data-testid=adornment-wrapper]").each(($el) => {
      cy.wrap($el).should("have.class", "hidden")
    })

    // Undo: percent should return
    toolbar.getUndoTool().click()
    cy.get("[data-testid=adornment-wrapper]").each(($el) => {
      cy.wrap($el).should("have.class", "visible")
    })
    cy.get("[data-testid^=graph-count]").first().should("contain.text", "%")

    // Redo: percent should be hidden again
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").each(($el) => {
      cy.wrap($el).should("have.class", "hidden")
    })
  })
  it("adds mean adornment to graph when Mean checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-mean]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean]").should("exist")
    cy.get("*[data-testid^=mean-line]").should("exist")
    cy.get("*[data-testid^=mean-cover]").should("exist")
    cy.get("*[data-testid^=mean-tip]").should("exist").should("not.be.visible")
    // TODO: Test that mean-tip appears on mouseover
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple means)
    cy.wait(250)
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-mean]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")

    // add tests for undo and redo for Mean checkbox

    toolbar.getUndoTool().click()
    cy.wait(250)

    // The mean line should be visible again after an undo
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean]").should("exist")
    cy.get("*[data-testid^=mean-line]").should("exist")
    cy.get("*[data-testid^=mean-cover]").should("exist")
    cy.get("*[data-testid^=mean-tip]").should("exist").should("not.be.visible")

    // The mean line should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds median adornment to graph when Median checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-median]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=median]").should("exist")
    cy.get("*[data-testid^=median-line]").should("exist")
    cy.get("*[data-testid^=median-cover]").should("exist")
    cy.get("*[data-testid^=median-tip]").should("exist").should("not.be.visible")
    // TODO: Test that median-tip appears on mouseover
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple medians)
    cy.wait(250)
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-median]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")

    // add tests for undo and redo for median checkbox

    toolbar.getUndoTool().click()
    cy.wait(250)

    // The median line should be visible again after an undo
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=median]").should("exist")
    cy.get("*[data-testid^=median-line]").should("exist")
    cy.get("*[data-testid^=median-cover]").should("exist")
    cy.get("*[data-testid^=median-tip]").should("exist").should("not.be.visible")

    // The median line should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds standard deviation adornment to graph when Standard Deviation checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-measuresOfSpread]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-standard-deviation]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=standard-deviation]").should("exist")
    cy.get("*[data-testid^=standard-deviation]").should("exist")
    cy.get("*[data-testid^=standard-deviation-cover]").should("not.exist")
    cy.get("*[data-testid^=standard-deviation-range]").should("exist")
    cy.get("*[data-testid^=standard-deviation-min]").should("exist")
    cy.get("*[data-testid^=standard-deviation-min-cover]").should("exist")
    cy.get("*[data-testid^=standard-deviation-max]").should("exist")
    cy.get("*[data-testid^=standard-deviation-max-cover]").should("exist")
    cy.get("*[data-testid^=standard-deviation-tip]").should("exist").should("not.be.visible")
    // TODO: Test that standard-deviation-tip appears on mouseover
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are
    // multiple standard deviations)
    cy.wait(250)
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-standard-deviation]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")

    // add tests for undo and redo for standard deviation checkbox

    toolbar.getUndoTool().click()
    cy.wait(250)

    // The standard deviation adornment should be visible again after an undo
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=standard-deviation]").should("exist")
    cy.get("*[data-testid^=standard-deviation]").should("exist")
    cy.get("*[data-testid^=standard-deviation-cover]").should("not.exist")
    cy.get("*[data-testid^=standard-deviation-range]").should("exist")
    cy.get("*[data-testid^=standard-deviation-min]").should("exist")
    cy.get("*[data-testid^=standard-deviation-min-cover]").should("exist")
    cy.get("*[data-testid^=standard-deviation-max]").should("exist")
    cy.get("*[data-testid^=standard-deviation-max-cover]").should("exist")
    cy.get("*[data-testid^=standard-deviation-tip]").should("exist").should("not.be.visible")
    cy.wait(250)

    // The standard deviation adornment should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds mean absolute deviation adornment to graph when Mean Absolute Deviation checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-measuresOfSpread]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-mean-absolute-deviation]")
      .should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean-absolute-deviation]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-cover]").should("not.exist")
    cy.get("*[data-testid^=mean-absolute-deviation-range]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-min]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-min-cover]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-max]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-max-cover]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-tip]").should("exist").should("not.be.visible")
    // TODO: Test that mean-absolute-deviation-tip appears on mouseover
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are
    // multiple mean absolute deviations)
    cy.wait(250)
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-mean-absolute-deviation]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")

    // add tests for undo and redo for MAD

    toolbar.getUndoTool().click()
    cy.wait(250)

    // The MAD adornment should be visible again after an undo
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean-absolute-deviation]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-cover]").should("not.exist")
    cy.get("*[data-testid^=mean-absolute-deviation-range]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-min]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-min-cover]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-max]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-max-cover]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-tip]").should("exist").should("not.be.visible")
    cy.wait(250)

    // The standard deviation adornment should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds box plot adornment to the graph when Box Plot checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Height", "bottom")
    cy.wait(100) // Added a brief wait to allow the plot animation to complete
    graph.getDisplayValuesButton().should("exist").click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-boxPlotAndNormalCurve]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-box-plot]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=box-plot]").should("exist")
    cy.get("*[data-testid^=box-plot-line]").should("exist")
    cy.get("*[data-testid^=box-plot-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-range]").should("exist")
    cy.get("*[data-testid^=box-plot-min]").should("exist")
    cy.get("*[data-testid^=box-plot-min-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-max]").should("exist")
    cy.get("*[data-testid^=box-plot-max-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-lower]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-lower-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-upper]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-upper-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-label]").should("exist").should("not.be.visible")
    cy.get("*[data-testid^=box-plot-outlier]").should("not.exist")
    cy.get("*[data-testid^=box-plot-outlier-cover]").should("not.exist")
    // TODO: Test Show Outliers option. Test that labels appear on mouseover.

    // add tests for undo and redo for box plot

    toolbar.getUndoTool().click()
    cy.wait(250)

    // The box plot adornment should be invisible after an undo
    // how to test this one? bpCheckbox.should("not.be.visible")?
    cy.wait(250)

    // The box plot adornment should be visible again after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=box-plot]").should("exist")
    cy.get("*[data-testid^=box-plot-line]").should("exist")
    cy.get("*[data-testid^=box-plot-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-range]").should("exist")
    cy.get("*[data-testid^=box-plot-min]").should("exist")
    cy.get("*[data-testid^=box-plot-min-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-max]").should("exist")
    cy.get("*[data-testid^=box-plot-max-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-lower]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-lower-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-upper]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-upper-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-label]").should("exist").should("not.be.visible")
    cy.get("*[data-testid^=box-plot-outlier]").should("not.exist")
    cy.get("*[data-testid^=box-plot-outlier-cover]").should("not.exist")

    cy.log("updates box plot adornment when data changes")
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "LifeSpan", "bottom")
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=box-plot]").should("exist")
    cy.get("*[data-testid^=box-plot-line]").should("exist")
    cy.get("*[data-testid^=box-plot-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-range]").should("exist")
    cy.get("*[data-testid^=box-plot-min]").should("exist")
    cy.get("*[data-testid^=box-plot-min-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-max]").should("exist")
    cy.get("*[data-testid^=box-plot-max-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-lower]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-lower-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-upper]").should("exist")
    cy.get("*[data-testid^=box-plot-whisker-upper-cover]").should("exist")
    cy.get("*[data-testid^=box-plot-label]").should("exist").should("not.be.visible")
    cy.get("*[data-testid^=box-plot-outlier]").should("not.exist")
    cy.get("*[data-testid^=box-plot-outlier-cover]").should("not.exist")

  })
  it("adds normal curve adornment to the graph when Normal Curve checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Height", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-boxPlotAndNormalCurve]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-normal-curve]").should("be.visible").click()
    cy.get("[data-testid=adornment-checkbox-show-measure-labels]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=normal-curve]").should("exist")
  })
  it("adds movable labels for univariate measures to graph when Show Measure Labels checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    cy.get("[data-testid=adornment-checkbox-mean]").click()
    cy.get("[data-testid=adornment-checkbox-show-measure-labels]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean]").should("exist")
    cy.get("*[data-testid^=mean-line]").should("exist")
    cy.get("*[data-testid^=mean-cover]").should("exist")
    cy.get("*[data-testid^=mean-tip]").should("not.exist")
    cy.get("*[data-testid^=mean-measure-labels-tip]").should("exist")
      .should("be.visible")
      .should("have.text", "mean=10.79")
      .should("have.css", "top", "0px")
      // The exact value of left may vary slightly depending on browser, screen resolution, etc.
      // The below checks that the value is within an expected range to accommodate these variations.
      // Modeled after https://github.com/cypress-io/cypress/issues/14722#issuecomment-767367519
      // @ts-expect-error -- type definition is incorrect: return value is property value not chained element
      .should("have.css", "left").should((left: string) => {
        expect(left).to.include("px")
        expect(parseInt(left, 10)).to.be.within(271, 273)
      })
    // TODO: Test drag and drop of label and saving of dropped coordinates
    cy.get("[data-testid=adornment-checkbox-show-measure-labels]").click()
    cy.get("*[data-testid^=mean-measure-labels-tip]").should("not.exist")
    // add tests for undo and redo for Show Measures label; checkbox
    toolbar.getUndoTool().click()
    cy.wait(250)

    // The Show Measures label should be visible again after an undo
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean]").should("exist")

    // The Show Measures label should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("*[data-testid^=mean-measure-labels-tip]").should("not.exist")
  })
  it("adds movable line to graph when Movable Line checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.dragAttributeToTarget("table", "Speed", "left")
    graph.getDisplayValuesButton().click()

    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-movable-line]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line]").should("exist")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]").should("not.be.empty")

    // The movable line should have three handles (lower, middle, upper) that are visible.
    cy.get("[data-testid=movable-line-lower-handle]").should("exist").and("have.css", "display", "block")
    cy.get("[data-testid=movable-line-middle-handle]").should("exist").and("have.css", "display", "block")
    cy.get("[data-testid=movable-line-upper-handle]").should("exist").and("have.css", "display", "block")
    // If the intercept is locked, the middle handle is hidden.
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-intercept-locked]").click()
    cy.get("[data-testid=movable-line-lower-handle]").should("have.css", "display", "block")
    cy.get("[data-testid=movable-line-middle-handle]").should("have.css", "display", "none")
    cy.get("[data-testid=movable-line-upper-handle]").should("have.css", "display", "block")
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-intercept-locked]").click()
    cy.get("[data-testid=movable-line-lower-handle]").should("have.css", "display", "block")
    cy.get("[data-testid=movable-line-middle-handle]").should("have.css", "display", "block")
    cy.get("[data-testid=movable-line-upper-handle]").should("have.css", "display", "block")

    // All handles should be hidden when focus taken off graph, and reappear when focus is back on graph.
    c.selectTile("table", 0)
    cy.get("[data-testid=movable-line-lower-handle]").should("have.css", "display", "none")
    cy.get("[data-testid=movable-line-middle-handle]").should("have.css", "display", "none")
    cy.get("[data-testid=movable-line-upper-handle]").should("have.css", "display", "none")
    c.selectTile("graph", 0)
    cy.get("[data-testid=movable-line-lower-handle]").should("have.css", "display", "block")
    cy.get("[data-testid=movable-line-middle-handle]").should("have.css", "display", "block")
    cy.get("[data-testid=movable-line-upper-handle]").should("have.css", "display", "block")

    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple lines)
    // TODO: Test dragging of line and equation value changes
    // TODO: Test unpinning equation box from line
    cy.wait(250)
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-movable-line]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")

    // add tests for undo and redo for Moveable Line checkbox
    toolbar.getUndoTool().click()
    cy.wait(250)

    // The Show Measures label should be visible again after an undo
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line]").should("exist")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]").should("not.be.empty")

    // The Show Measures label should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")

  })
  it("adds plotted value UI to graph when Plotted Value checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 0\)/)
    graph.getDisplayValuesButton().click()

    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-otherValues]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-plotted-value]").should("be.visible").click()
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 22\)/)
    cy.get("[data-testid=graph-adornments-banners]").should("exist")
    cy.get("[data-testid=plotted-value-control]").should("exist")
    cy.get("[data-testid=plotted-value-control-label]").should("exist")
    cy.get("[data-testid=plotted-value-control-value]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-value-control-label]").should("exist").should("have.text", "value =")
    cy.get("[data-testid=plotted-value-control-value]").should("exist").should("have.text", "")
    cy.wait(250)
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-plotted-value]").click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 0\)/)

    // Adds a test for undo and redo for plotted value checkbox
    toolbar.getUndoTool().click()
    cy.wait(250)

    // The plotted value should be visible again after an undo
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 22\)/)
    cy.get("[data-testid=graph-adornments-banners]").should("exist")
    cy.get("[data-testid=plotted-value-control]").should("exist")
    cy.get("[data-testid=plotted-value-control-label]").should("exist")
    cy.get("[data-testid=plotted-value-control-value]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-value-control-label]").should("exist").should("have.text", "value =")
    cy.get("[data-testid=plotted-value-control-value]").should("exist").should("have.text", "")
    cy.wait(250)

    // The plotted function should be hidden after a redo
    toolbar.getRedoTool().click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
    cy.get("[data-testid=plot-cell-background]").should("have.attr", "transform").and("match", /translate\(.*, 0\)/)

  })
  it("allows adding a plotted value to the graph by entering a value into the plotted value UI", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-otherValues]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-plotted-value]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-value-control-value]").click()
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    cy.get("[data-testid=formula-editor-input] .cm-content").realType("10")
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=plotted-value]").should("exist")
    cy.get("*[data-testid^=plotted-value-line]").should("exist")
    cy.get("*[data-testid^=plotted-value-cover]").should("exist")
    cy.get("*[data-testid^=plotted-value-tip]").should("exist").should("have.text", "value=10")
    // TODO: Also test the above after attributes are added to top and right axes
    // (i.e. when there are multiple plotted values)
  })
  it("shows a plotted value error when incorrect formula is used", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-otherValues]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-plotted-value]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-value-control-value]").click()
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    cy.get("[data-testid=formula-editor-input] .cm-content").realType("mean(Sl")
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=plotted-value-error]").should("exist").should("include.text", "Undefined symbol")
    // Error should be cleaned up after the formula is fixed
    cy.get("[data-testid=plotted-value-control-value]").click()
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    for (let i = 0; i < 8; i++) {
      cy.get("[data-testid=formula-editor-input] .cm-content").clear()
    }
    cy.get("[data-testid=formula-editor-input] .cm-content").realType("mean(Sleep)")
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=plotted-value-error]").should("not.exist")
  })
  it("removes plotted value from the graph when both x and y axes are set to numeric attributes", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-otherValues]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-plotted-value]").click()
    cy.get("[data-testid=plotted-value-control-value]").click()
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    cy.get("[data-testid=formula-editor-input] .cm-content").realType("10")
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=plotted-value]").should("exist")
    cy.get("*[data-testid^=plotted-value-line]").should("exist")
    cy.get("*[data-testid^=plotted-value-cover]").should("exist")
    cy.get("*[data-testid^=plotted-value-tip]").should("exist").should("have.text", "value=10")
    cy.get("[data-testid=plotted-value-control-value]").click()
    cy.get("[data-testid=formula-editor-input] .cm-content").should("be.visible").and("have.focus")
    cy.get("[data-testid=formula-editor-input] .cm-content").clear().clear()
    cy.get("[data-testid=Apply-button]").click()
    cy.get("*[data-testid^=plotted-value-line]").should("not.exist")
    cy.get("*[data-testid^=plotted-value-cover]").should("not.exist")
    cy.get("*[data-testid^=plotted-value-tip]").should("not.exist")
  })
  it("adds movable value to graph when Movable Value button is clicked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()

    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-otherValues]").click()
    cy.get("[data-testid=adornment-button-movable-value--add]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=movable-value]").should("exist")
    cy.get(".movable-value-label").should("have.length", 1)
    cy.get(".movable-value-fill").should("have.length", 0)
    // Commenting below 6 lines as they're flaky and cause random test failures
    // cy.log("clicking movable value button -- 1")
    // movableValueButton.click()
    // cy.log("clicking movable value add button")
    // cy.get("[data-testid=adornment-button-movable-value--add]").click()
    // cy.get(".movable-value-label").should("have.length", 2)
    // cy.get(".movable-value-fill").should("have.length", 1)

    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple values)
    // TODO: Test dragging of value
    // cy.wait(250)
    // cy.log("clicking movable value button -- 2")
    // movableValueButton.click()
    // cy.log("clicking movable value remove button")
    // cy.get("[data-testid=adornment-button-movable-value--remove]").click()
    // cy.get(".movable-value-label").should("have.length", 1)
    // cy.get(".movable-value-fill").should("have.length", 0)
    // cy.wait(250)
    // cy.log("clicking movable value button -- 3")
    // movableValueButton.click()
    // cy.log("clicking movable value remove button")
    // cy.get("[data-testid=adornment-button-movable-value--remove]").click()
    // cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
    // cy.get(".movable-value-label").should("have.length", 0)
    // cy.get(".movable-value-fill").should("have.length", 0)

        // TODO: Add a test for undo and redo for moveable value checkbox
  })

  it("renders count per region defined by Movable Values", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayValuesButton().click()
    cy.get("[data-testid=adornment-checkbox-count-count]").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get(".sub-count").should("have.length", 0)
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-otherValues]").click()
    cy.get("[data-testid=adornment-button-movable-value--add]").click()
    cy.get(".sub-count").should("have.length", 2)
    cy.get("[data-testid=adornment-button-movable-value--add]").click()
    cy.get(".sub-count").should("have.length", 3)
  })
  it("renders count per region defined by bin boundaries when 'Group into Bins' is selected", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "bottom")
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=bins-radio-button]").click()
    cy.wait(500)
    graph.getDisplayValuesButton().click()
    cy.get("[data-testid=adornment-checkbox-count-count]").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get(".sub-count").should("have.length", 10).and("have.class", "x-axis").and("have.class", "binned-points-count")
    cy.get("[data-testid=axis-legend-attribute-button-bottom]").click()
    cy.get("button").contains("Remove X: Sleep").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get(".sub-count").should("have.length", 0)
    // Wait for graph to stabilize after attribute removal (can trigger React warnings)
    cy.wait(1000)
    // Select graph before drag to ensure it's ready to receive the drop
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "left")
    cy.wait(2000)  // Wait longer for graph to fully stabilize after drag
    // Re-select graph after drag from table to update inspector panel
    c.selectTile("graph", 0)
    cy.wait(1000)  // Wait for inspector panel to update after tile selection
    // Click config button first (always visible), then set up bins
    graph.getDisplayConfigButton().should("exist").click()
    cy.get("[data-testid=bins-radio-button]").should("exist").click()
    cy.wait(500)
    graph.getDisplayValuesButton().should("exist").click()
    cy.get(".sub-count").should("have.length", 10).and("have.class", "y-axis").and("have.class", "binned-points-count")
  })
  it("creates a binned dot plot with categorical axes and verifies even stacks", () => {
    // Set up categorical axes
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Diet", "bottom")
    // Open the inspector panel first
    graph.getDisplayValuesButton().click()
    cy.wait(500) // Wait for the inspector panel to fully load

    // Now try to access the display config button
    cy.get("[data-testid=graph-display-config-button]").should("exist").click()
    // Click the 'Fuse Dots into Bars' checkbox
    cy.get('[data-testid=bar-chart-checkbox]').click()
    cy.wait(500)

    // Check that "both", "meat", and "plants" appear as x-axis tick labels
    ae.getAxisTickLabels("bottom", true).then($labels => {
      const labelTexts = [...$labels].map(el => el.textContent?.trim())
      expect(labelTexts).to.include.members(["both", "meat", "plants"])
      // Uniqueness and visibility
      const uniqueLabels = new Set(labelTexts)
      expect(uniqueLabels.size).to.equal(labelTexts.length)
      Array.from($labels).forEach((el: HTMLElement) => {
        const style = window.getComputedStyle(el)
        expect(style.display).to.not.equal("none")
        expect(style.visibility).to.not.equal("hidden")
        expect(el.getAttribute("opacity")).to.not.equal("0")
      })
    })

    // Check that "count" is the y-axis label
    ae.getAxisLabel("left").should("contain.text", "Count")

    // Check y-axis tick labels for uniqueness and visibility
    ae.getAxisTickLabels("left", false).then($labels => {
      const labelTexts = [...$labels].map(el => el.textContent?.trim())
      const uniqueLabels = new Set(labelTexts)
      expect(uniqueLabels.size).to.equal(labelTexts.length)
      Array.from($labels).forEach((el: HTMLElement) => {
        const style = window.getComputedStyle(el)
        expect(style.display).to.not.equal("none")
        expect(style.visibility).to.not.equal("hidden")
        expect(el.getAttribute("opacity")).to.not.equal("0")
      })
    })
  })
})

context("Graph Adornments with URL Parameters", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor&suppressUnsavedWarning&ICI=true&gaussianFit=true"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  it("adds a box plot with ICI option when `ICI` URL parameter is set and Show Informal CI option is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Height", "bottom")
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-boxPlotAndNormalCurve]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-box-plot]").should("be.visible").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-box-plot-show-ici]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=box-plot]").should("exist")
    cy.get("*[data-testid^=box-plot-ici]").should("exist")
    cy.get("*[data-testid^=box-plot-ici-cover]").should("exist")
  })
  it("adds a Gaussian Fit option when `gaussianFit` URL parameter is set", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Height", "bottom")
    cy.get("[data-testid=graph-display-config-button]").click()
    graph.getInspectorPalette().find("[data-testid=bins-radio-button]").click()
    graph.getInspectorPalette().find("[data-testid=bar-chart-checkbox]").click()
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
    graph.getInspectorPalette().find("[data-testid=adornment-toggle-boxPlotAndNormalCurve]").click()
    graph.getInspectorPalette().find("[data-testid=adornment-checkbox-normal-curve]").should("be.visible").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=normal-curve]").should("exist")
    cy.get("*[data-testid^=normal-curve-hover-cover]").click({ force: true})
    cy.get("*[data-testid^=normal-curve-tip]").should("exist").should("contain.text", "Gaussian Fit:")
  })
})
