export const MapLegendElements = {
  getMapTile() {
    return cy.get(".codap-map")
  },
  getLegend() {
    return this.getMapTile().find("[data-testid=legend-component]")
  },
  getLegendName() {
    return this.getLegend().find("[data-testid=attribute-label]")
  },
  getCategoricalLegendCategories() {
    return this.getLegend().find("[data-testid=legend-key]")
  },
  getCategoricalLegendCategory(name: string) {
    return this.getCategoricalLegendCategories().contains(name)
  },
  getNumericLegendCategories() {
    return this.getLegend().find("[data-testid=legend-categories]>svg rect")
  },
  getLegendAttributeMenu() {
    return this.getMapTile().find("[data-testid=attribute-label-menu-legend]")
  },
  getAttributeFromLegendMenu() {
    // The menu items are rendered in a Portal at the body level, so we need to find the MenuList by data-testid
    return cy.get('[data-testid="axis-legend-attribute-menu-list-legend"]')
  },
  getLegendDropZone() {
    return this.getMapTile().find(".leaflet-container")
  }
}
