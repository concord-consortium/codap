import { LegendElements as le } from "../elements/legend-elements"

export const LegendHelper = {
  verifyLegendDoesNotExist() {
    le.getLegend().should("not.exist")
  },
  verifyLegendLabel(name, legendType = "graph") {
    le.getLegendName(legendType).should("have.text", name)
  },
  verifyCategoricalLegend(num, legendType = "graph") {
    le.getCategoricalLegendCategories(legendType).should("exist")
    le.getCategoricalLegendCategories(legendType).should("have.length", num)
  },
  verifyNumericLegend(legendType = "graph") {
    le.getNumericLegendCategories(legendType).should("exist")
  },
  selectCategoryNameForCategoricalLegend(name, legendType = "graph") {
    le.getCategoricalLegendCategory(name, legendType).click()
  },
  selectCategoryColorForCategoricalLegend(name, legendType = "graph") {
    le.getCategoricalLegendCategory(name, legendType).parent().find("rect").click()
  },
  unselectLegendCategory(legendType = "graph") {
    switch(legendType) {
      case "map":
        le.getMapTile().find(".map-dot-area").eq(0).click({force:true})
        break
      case "graph":
      default:
        le.getGraphTile().find(".plot-cell-background").eq(0).click({force:true})
        break
    }
  },
  verifyCategoricalLegendKeySelected(name, num, legendType = "graph") {
    le.getCategoricalLegendCategory(name, legendType).parent().find("rect").should("have.class", "legend-rect-selected")
    switch(legendType) {
      case "map":
        le.getMapTile().find(".map-dot-area circle.graph-dot-highlighted").should("have.length", num)
        break
      case "graph":
      default:
        le.getGraphTile().find(".graph-dot-area circle.graph-dot-highlighted").should("have.length", num)
        break
    }
  },
  verifyNumericLegendKeySelected(num, legendType = "graph") {
    le.getNumericLegendCategories(legendType).should("have.class", "legend-rect-selected")
    switch(legendType) {
      case "map":
        le.getMapTile().find(".map-dot-area circle.graph-dot-highlighted").should("have.length", num)
        break
      case "graph":
        le.getGraphTile().find(".graph-dot-area circle.graph-dot-highlighted").should("have.length", num)
        break
    }
  },
  verifyNoLegendCategorySelectedForCategoricalLegend(legendType = "graph") {
    le.getCategoricalLegendCategories(legendType).each($category => {
      cy.wrap($category).find("rect").should("not.have.class", "legend-rect-selected")
    })
    switch(legendType) {
      case "map":
        le.getMapTile().find(".map-dot-area circle.graph-dot-highlighted").should("have.length", 0)
        break
      case "graph":
        le.getGraphTile().find(".graph-dot-area circle.graph-dot-highlighted").should("have.length", 0)
        break
    }
  },
  verifyNoLegendCategorySelectedForNumericLegend(legendType = "graph") {
    le.getNumericLegendCategories(legendType).each($category => {
      cy.wrap($category).should("not.have.class", "legend-rect-selected")
    })
    switch(legendType) {
      case "map":
        le.getMapTile().find(".map-dot-area circle.graph-dot-highlighted").should("have.length", 0)
        break
      case "graph":
        le.getGraphTile().find(".graph-dot-area circle.graph-dot-highlighted").should("have.length", 0)
        break
    }
  },
  selectNumericLegendCategory(index, legendType = "graph") {
    le.getNumericLegendCategories(legendType).eq(index).click()
  },
  verifyLegendQuintileSelected(index, legendType = "graph") {
    le.getNumericLegendCategories(legendType).eq(index).should("have.class", "legend-rect-selected")
  },
  dragAttributeToPlot(name) {
    cy.dragAttributeToTarget("table", name, "graph_plot")
  },
  dragAttributeToLegend(name) {
    cy.dragAttributeToTarget("table", name, "legend")
  },
  openLegendMenu(legendType = "graph") {
    le.getLegendAttributeMenu(legendType).click()
  },
  addAttributeToLegend(name, legendType = "graph") {
    le.getAttributeFromLegendMenu(legendType).contains(name).click()
  },
  removeAttributeFromLegend(name, legendType = "graph") {
    le.getAttributeFromLegendMenu(legendType).contains(`Remove Legend: ${name}`).click()
  },
  treatLegendAttributeAsCategorical() {
    le.getAttributeFromLegendMenu().contains("Treat as Categorical").click()
  },
  treatAttributeAsNumeric() {
    le.getAttributeFromLegendMenu().contains("Treat as Numeric").click()
  }
}
