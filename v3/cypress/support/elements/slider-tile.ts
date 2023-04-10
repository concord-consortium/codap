export const SliderTileElements = {
  getSliderTile() {
    return cy.get(".codap-slider")
  },
  getComponentTitle() {
    return this.getSliderTile().find("[data-testid=editable-component-title]")
  }
}
