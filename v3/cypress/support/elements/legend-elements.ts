export const LegendElements = {
  getGraphTile() {
    return cy.get(".codap-graph")
  },
  getLegend() {
    return this.getGraphTile().find(".graph-plot .legend-component")
  },
  getLegendName() {
    return this.getLegend().find(".attribute-label")
  },
  getCategoricalLegendCategories() {
    return this.getLegend().find("[data-testid=legend-key]")
  },
  getCategoricalLegendCategory(name) {
    return this.getCategoricalLegendCategories().contains(name)
  },
  getNumericalLegendCategories() {
    return this.getLegend().find(".legend-categories>svg rect")
  },
  getLegendAttributeMenu() {
    return this.getGraphTile().find(".axis-legend-attribute-menu.legend .chakra-menu__menu-button")
  },
  getAttributeFromLegendMenu() {
    return this.getLegendAttributeMenu().parent()
  }
}
