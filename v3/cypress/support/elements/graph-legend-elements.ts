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
    return this.getLegend().find('[data-testid^="legend-key-"]')
  },
  getCategoricalLegendCategory(name: string) {
    return this.getCategoricalLegendCategories().contains(name)
  },
  getNumericLegendCategories() {
    return this.getLegend().find("[data-testid=legend-categories]>svg rect")
  },
  // The min and max labels at the two ends of a numeric legend
  getNumericLegendEndLabels() {
    return this.getLegend().find(".legend-axis-label text")
  },
  getLegendAttributeMenu() {
    return this.getGraphTile().find("[data-testid=attribute-label-menu-legend]")
  },
  getAttributeFromLegendMenu() {
    // The menu items are rendered in a Portal at the body level, so we need to find the MenuList by data-testid
    return cy.get('[data-testid="axis-attr-menu-legend"]')
  }
}
