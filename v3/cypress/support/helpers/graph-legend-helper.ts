import { GraphLegendElements as gle } from "../elements/graph-legend-elements"

export const GraphLegendHelper = {
  verifyLegendDoesNotExist() {
    gle.getLegend().should("not.exist")
  },
  verifyLegendLabel(name) {
    gle.getLegendName().should("have.text", name)
  },
  verifyCategoricalLegend(num) {
    gle.getCategoricalLegendCategories().should("exist")
    gle.getCategoricalLegendCategories().should("have.length", num)
  },
  verifyNumericLegend() {
    gle.getNumericLegendCategories().should("exist")
  },
  selectCategoryNameForCategoricalLegend(name) {
    gle.getCategoricalLegendCategory(name).click()
  },
  selectCategoryColorForCategoricalLegend(name) {
    gle.getCategoricalLegendCategory(name).parent().find("rect").click()
  },
  unselectLegendCategory() {
        gle.getGraphTile().find(".plot-cell-background").eq(0).click({force:true})
  },
  verifyCategoricalLegendKeySelected(name) {
    gle.getCategoricalLegendCategory(name).parent().find("rect").should("have.class", "legend-rect-selected")
  },
  verifyNumericLegendKeySelected() {
    gle.getNumericLegendCategories().should("have.class", "legend-rect-selected")
  },
  verifyNoLegendCategorySelectedForCategoricalLegend() {
    gle.getCategoricalLegendCategories().each($category => {
      cy.wrap($category).find("rect").should("not.have.class", "legend-rect-selected")
    })
  },
  verifyNoLegendCategorySelectedForNumericLegend() {
    gle.getNumericLegendCategories().each($category => {
      cy.wrap($category).should("not.have.class", "legend-rect-selected")
    })
  },
  selectNumericLegendCategory(index) {
    gle.getNumericLegendCategories().eq(index).click()
  },
  verifyLegendQuintileSelected(index) {
    gle.getNumericLegendCategories().eq(index).should("have.class", "legend-rect-selected")
  },
  dragAttributeToPlot(name) {
    cy.dragAttributeToTarget("table", name, "graph_plot")
  },
  dragAttributeToLegend(name) {
    cy.dragAttributeToTarget("table", name, "legend")
  },
  openLegendMenu() {
    gle.getLegendAttributeMenu().click()
  },
  addAttributeToLegend(name) {
    gle.getAttributeFromLegendMenu().contains(name).click()
  },
  removeAttributeFromLegend(name) {
    gle.getAttributeFromLegendMenu().contains(`Remove Legend: ${name}`).click()
  },
  treatLegendAttributeAsCategorical() {
    gle.getAttributeFromLegendMenu().contains("Treat as Categorical").click()
  },
  treatAttributeAsNumeric() {
    gle.getAttributeFromLegendMenu().contains("Treat as Numeric").click()
  }
}
