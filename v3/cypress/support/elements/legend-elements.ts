export const LegendElements = {
  getGraphTile() {
    return cy.get(".codap-graph")
  },
  getMapTile() {
    return cy.get(".codap-map")
  },
  getLegend(legendType = "graph") {
    switch(legendType) {
      case "map":
        return this.getMapTile().find("[data-testid=legend-component]")
      case "graph":
      default:
        return this.getGraphTile().find("[data-testid=legend-component]")
    }
  },
  getLegendName(legendType = "graph") {
    return this.getLegend(legendType).find("[data-testid=attribute-label]")
  },
  getCategoricalLegendCategories(legendType = "graph") {
    return this.getLegend(legendType).find("[data-testid=legend-key]")
  },
  getCategoricalLegendCategory(name, legendType = "graph") {
    return this.getCategoricalLegendCategories(legendType).contains(name)
  },
  getNumericLegendCategories(legendType = "graph") {
    return this.getLegend(legendType).find("[data-testid=legend-categories]>svg rect")
  },
  getLegendAttributeMenu(legendType = "graph") {
    switch(legendType) {
      case "map":
        return this.getMapTile().find("[data-testid=attribute-label-menu-legend]")
      case "graph":
      default:
        return this.getGraphTile().find("[data-testid=attribute-label-menu-legend]")
    }
  },
  getAttributeFromLegendMenu(legendType = "graph") {
    return this.getLegendAttributeMenu(legendType).parent()
  }
}
