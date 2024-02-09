export const GraphLegendElements = {
  getGraphTile() {
    return cy.get(".codap-graph")
  },
  getLegend() {
    return this.getGraphTile().find("[data-testid=legend-component]")
  },
  getLegendName() {
    return this.getLegend().find("[data-testid=attribute-label]")
  },
  getCategoricalLegendCategories() {
    return this.getLegend().find("[data-testid=legend-key]")
  },
  getCategoricalLegendCategory(name) {
    return this.getCategoricalLegendCategories().contains(name)
  },
  getNumericLegendCategories() {
    return this.getLegend().find("[data-testid=legend-categories]>svg rect")
  },
  getLegendAttributeMenu() {
    return this.getGraphTile().find("[data-testid=attribute-label-menu-legend]")
  },
  getAttributeFromLegendMenu() {
    return this.getLegendAttributeMenu().parent()
  }
}
