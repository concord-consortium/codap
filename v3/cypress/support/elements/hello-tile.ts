export const HelloTileElements = {
  getHelloTile() {
    return cy.get(".hello-codap")
  },
  getCollectionTitle() {
    return this.getHelloTile().find("[data-testid=editable-component-title]")
  }
}
