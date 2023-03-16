export const DataSummaryTileElements = {
  getDataSummaryTile() {
    return cy.get(".codap-data-summary")
  },
  getCollectionTitle() {
    return this.getDataSummaryTile().find("[data-testid=editable-component-title]")
  }
}
