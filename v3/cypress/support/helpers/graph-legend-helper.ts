import { GraphLegendElements as gle } from "../elements/graph-legend-elements"

export const GraphLegendHelper = {
  verifyLegendDoesNotExist() {
    gle.getLegend().should("not.exist")
  },
  verifyLegendLabel(name: string) {
    gle.getLegendName().should("have.text", name)
  },
  verifyCategoricalLegend(num: number) {
    gle.getCategoricalLegendCategories().should("exist")
    gle.getCategoricalLegendCategories().should("have.length", num)
  },
  verifyNumericLegend() {
    gle.getNumericLegendCategories().should("exist")
  },
  verifyColorLegend(name: string) {
    // Color legends display the attribute's name but nothing else
    this.verifyLegendLabel(name)
    gle.getCategoricalLegendCategories().should("not.exist")
    gle.getNumericLegendCategories().should("not.exist")
  },
  selectCategoryNameForCategoricalLegend(name: string) {
    gle.getCategoricalLegendCategory(name).click()
  },
  selectCategoryColorForCategoricalLegend(name: string) {
    gle.getCategoricalLegendCategory(name).parent().find("rect").click()
  },
  unselectLegendCategory() {
        gle.getGraphTile().find(".plot-cell-background").eq(0).click({force:true})
  },
  verifyCategoricalLegendKeySelected(name: string) {
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
  selectNumericLegendCategory(index: number) {
    gle.getNumericLegendCategories().eq(index).click()
  },
  verifyLegendQuintileSelected(index: number) {
    gle.getNumericLegendCategories().eq(index).should("have.class", "legend-rect-selected")
  },
  dragAttributeToPlot(name: string) {
    cy.dragAttributeToTarget("table", name, "graph-plot")
  },
  dragAttributeToLegend(name: string) {
    cy.dragAttributeToTarget("table", name, "graph-legend")
  },
  openLegendMenu() {
    gle.getLegendAttributeMenu().click()
  },
  addAttributeToLegend(name: string) {
    gle.getAttributeFromLegendMenu().contains(name).click()
  },
  removeAttributeFromLegend(name: string) {
    gle.getAttributeFromLegendMenu().contains(`Remove Legend: ${name}`).click()
  },
  treatLegendAttributeAsCategorical() {
    gle.getAttributeFromLegendMenu().contains("Treat as Categorical").click()
  },
  treatAttributeAsNumeric() {
    gle.getAttributeFromLegendMenu().contains("Treat as Numeric").click()
  }
}
