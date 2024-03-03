import { MapLegendElements as mle } from "../elements/map-legend-elements"

export const MapLegendHelper = {
  verifyLegendDoesNotExist() {
    mle.getLegend().should("not.exist")
  },
  verifyLegendLabel(name) {
    mle.getLegendName().should("have.text", name)
  },
  verifyCategoricalLegend(num) {
    mle.getCategoricalLegendCategories().should("exist")
    mle.getCategoricalLegendCategories().should("have.length", num)
  },
  verifyNumericLegend() {
    mle.getNumericLegendCategories().should("exist")
  },
  selectCategoryNameForCategoricalLegend(name) {
    mle.getCategoricalLegendCategory(name).click()
  },
  selectCategoryColorForCategoricalLegend(name) {
    mle.getCategoricalLegendCategory(name).parent().find("rect").click()
  },
  unselectLegendCategory() {
    mle.getMapTile().find(".map-dot-area").eq(0).click({force:true})
  },
  verifyCategoricalLegendKeySelected(name, num) {
    mle.getCategoricalLegendCategory(name).parent().find("rect").should("have.class", "legend-rect-selected")
  },
  verifyNumericLegendKeySelected(num) {
    mle.getNumericLegendCategories().should("have.class", "legend-rect-selected")
  },
  verifyNoLegendCategorySelectedForCategoricalLegend() {
    mle.getCategoricalLegendCategories().each($category => {
      cy.wrap($category).find("rect").should("not.have.class", "legend-rect-selected")
    })
  },
  verifyNoLegendCategorySelectedForNumericLegend() {
    mle.getNumericLegendCategories().each($category => {
      cy.wrap($category).should("not.have.class", "legend-rect-selected")
    })
  },
  selectNumericLegendCategory(index) {
    mle.getNumericLegendCategories().eq(index).click()
  },
  verifyLegendQuintileSelected(index) {
    mle.getNumericLegendCategories().eq(index).should("have.class", "legend-rect-selected")
  },
  dragAttributeToLegend(name) {
    cy.dragAttributeToTarget("table", name, "map-legend")
  },
  openLegendMenu() {
    mle.getLegendAttributeMenu().click()
  },
  addAttributeToLegend(name) {
    mle.getAttributeFromLegendMenu().contains(name).click()
  },
  removeAttributeFromLegend(name) {
    mle.getAttributeFromLegendMenu().contains(`Remove Legend: ${name}`).click()
  },
  treatLegendAttributeAsCategorical() {
    mle.getAttributeFromLegendMenu().contains("Treat as Categorical").click()
  },
  treatAttributeAsNumeric() {
    mle.getAttributeFromLegendMenu().contains("Treat as Numeric").click()
  }
}
