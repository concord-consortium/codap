export const GraphTileElements = {
  getGraphTile() {
    return cy.get(".codap-graph")
  },
  getCollectionTitle() {
    return this.getGraphTile().find("[data-testid=editable-component-title]")
  }
}
