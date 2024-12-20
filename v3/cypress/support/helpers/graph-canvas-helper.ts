import { AxisHelper as ah } from "./axis-helper"

export const GraphCanvasHelper = {
  // Helper function to locate the graph element and retrieve its dynamic ID.
  getGraphTileId(): Cypress.Chainable<string> {
    cy.log('Locate the graph element and retrieve its dynamic ID')
    return cy.get('[data-testid=codap-graph]')
      .parents('.free-tile-component')
      .invoke('attr', 'id')
      .then((tileId) => {
        if (!tileId) {
          throw new Error('Error: tileId is undefined or null.')
        }
        cy.log(`Graph Tile ID Retrieved: ${tileId}`)
        return Cypress.Promise.resolve(tileId) // Ensure Cypress compatibility
      })
  },
  // Helper function to set an attribute for the axis and retrieve the tile ID.
  setAxisAndRetrieveTileId (attribute: string, axis: "bottom" | "left") {
    cy.log(`Set ${attribute} on ${axis} axis`)
    ah.openAxisAttributeMenu(axis)
    ah.selectMenuAttribute(attribute, axis)
    cy.wait(500)

    cy.log('Locate the graph element and retrieve its dynamic ID')
    return cy.get('[data-testid=codap-graph]')
      .parents('.free-tile-component')
      .invoke('attr', 'id')
  },
  // Helper function to validate pixi metadata and point count.
  validateGraphPointCount(tileId: string | undefined, expectedPointCount: number) {
    if (!tileId) {
      throw new Error("Error: tileId is undefined or null. Cannot validate graph point count.")
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
  },
  getPixiPointPosition(tileId: string, pointIndex: number): Cypress.Chainable<{ x: number; y: number }> {
    cy.log("Get the PixiPoint position")
    return cy.window().then((win: any) => {
      const pixiPoints = win.pixiPointsMap[tileId]
      cy.log(`PixiPoints for Tile ID ${tileId}:`, pixiPoints)

      // Use optional chaining to check if pixiPoints and pixiPoints[0] exist
      if (!pixiPoints?.[0]) {
        throw new Error(`PixiPoints for tile ID ${tileId} is undefined or empty.`)
      }

      // Retrieve the point position
      const pointPosition = pixiPoints[0].points[pointIndex]?.position
      if (!pointPosition) {
        throw new Error(`Point at index ${pointIndex} does not exist for tile ID ${tileId}.`)
      }
      cy.log(`Point Position (Index ${pointIndex}): x=${pointPosition.x}, y=${pointPosition.y}`)

      // Use cy.wrap to make the position Cypress-compatible
      return cy.wrap({ x: pointPosition.x, y: pointPosition.y })
    })
  }
}
