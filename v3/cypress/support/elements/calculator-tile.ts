export const CalculatorTileElements = {
  getCalculatorTile() {
    return cy.get(".codap-component.calculator")
  },
  getCollectionTitle() {
    return this.getCalculatorTile().find("[data-testid=editable-component-title]")
  }
}
