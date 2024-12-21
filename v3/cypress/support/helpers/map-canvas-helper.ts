// import { AxisHelper as ah } from "./axis-helper"

export const MapCanvasHelper = {
  // Helper function to locate the graph element and retrieve its dynamic ID.
  getMapTileId(): Cypress.Chainable<string> {
    cy.log('Locate the map element and retrieve its dynamic ID')
    return cy.get('[data-testid=codap-map]')
      .parents('.free-tile-component')
      .invoke('attr', 'id')
      .then((tileId) => {
        if (!tileId) {
          throw new Error('Error: tileId is undefined or null.')
        }
        cy.log(`Map Component Tile ID Retrieved: ${tileId}`)
        return Cypress.Promise.resolve(tileId) // Ensure Cypress compatibility
      })
  },
  // // Helper function to set an attribute for the axis and retrieve the tile ID.
  // setAxisAndRetrieveTileId (attribute: string, axis: "bottom" | "left") {
  //   cy.log(`Set ${attribute} on ${axis} axis`)
  //   ah.openAxisAttributeMenu(axis)
  //   ah.selectMenuAttribute(attribute, axis)
  //   cy.wait(500)

  //   cy.log('Locate the graph element and retrieve its dynamic ID')
  //   return cy.get('[data-testid=codap-graph]')
  //     .parents('.free-tile-component')
  //     .invoke('attr', 'id')
  // },
  // Helper function to validate pixi metadata and point count.
  validateMapPointCount(tileId: string | undefined, expectedPointCount: number) {
    if (!tileId) {
      throw new Error("Error: tileId is undefined or null. Cannot validate map point count.")
    }

    cy.log('Get the pixi metadata')
    cy.window().then((win: any) => {
      const pixiPoints = win.pixiPointsMap[tileId] // Access pixiPoints using the graph ID
      cy.log('PixiPoints Object:', pixiPoints) // Log the pixiPoints object for verification

      // Assert that pixiPoints exist
      chai.assert.exists(pixiPoints, "PixiPoints object exists")

      // Assert that pixiPoints[0] exists
      chai.assert.exists(pixiPoints[0], "PixiPoints[0] exists")

      // Access pointsCount
      const pointsCount = pixiPoints[0].pointsCount // Use the getter to determine the number of points
      cy.log(`Number of Points (pointsCount): ${pointsCount}`)

      // Assert the number of points
      expect(pointsCount).to.equal(expectedPointCount, "Point count matches expected value")
    })
  }
}
