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
  getCategoricalLegendCategory(name) {
    return this.getCategoricalLegendCategories().contains(name)
  },
  getNumericLegendCategories() {
    return this.getLegend().find("[data-testid=legend-categories]>svg rect")
  },
  getLegendAttributeMenu() {
    return this.getMapTile().find("[data-testid=attribute-label-menu-legend]")
  },
  getAttributeFromLegendMenu() {
    return this.getLegendAttributeMenu().parent()
  },
  getLegendDropZone() {
    return this.getMapTile().find(".leaflet-container")
  }
}
