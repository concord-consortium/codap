export const SliderTileElements = {
  getSliderTile() {
    return cy.get(".codap-slider")
  },
  getCollectionTitle() {
    return this.getSliderTile().find("[data-testid=editable-component-title]")
  }
}
