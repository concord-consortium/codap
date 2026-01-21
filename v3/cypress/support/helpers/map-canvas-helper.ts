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
  // Helper function to validate pixi metadata and point count.
  validateMapPointCount(tileId: string | undefined, expectedPointCount: number) {
    if (!tileId) {
      throw new Error("Error: tileId is undefined or null. Cannot validate map point count.")
    }

    cy.log('Get the pixi metadata')
    cy.window().then((win: any) => {
      const pixiPoints = win.rendererArrayMap[tileId] // Access pixiPoints using the tile ID
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
  // Checks if the points in a graph have unique fill colors.
  getPixiPointFillColors(tileId: string): Cypress.Chainable<string[]> {
    cy.log("Get all PixiPoint fill colors from textures")
    return cy.window().then((win: any) => {
      const pixiPoints = win.rendererArrayMap[tileId]
      const textures = pixiPoints[0].texturesMap // Access textures directly from PixiPoints

      if (!textures) {
        throw new Error("Textures object is undefined.")
      }

      // Array to store extracted fill colors
      const fillColors: string[] = []

      if (typeof textures.entries === "function") {
        for (const [key] of textures.entries()) {
          try {
            // Parse the key to extract the `fill` color
            const parsedKey = JSON.parse(key)
            if (parsedKey.fill) {
              fillColors.push(parsedKey.fill)
            }
          } catch (error) {
            cy.log(`Error parsing texture key: ${key}`, error)
          }
        }
      } else {
        // If textures is an object
        for (const key of Object.keys(textures)) {
          try {
            // Parse the key to extract the `fill` color
            const parsedKey = JSON.parse(key)
            if (parsedKey.fill) {
              fillColors.push(parsedKey.fill)
            }
          } catch (error) {
            cy.log(`Error parsing texture key: ${key}`, error)
          }
        }
      }

      cy.log("Extracted Fill Colors:", fillColors)

      if (fillColors.length === 0) {
        throw new Error("No fill colors found in the textures map.")
      }

      return cy.wrap(fillColors)
    })
  }
}
