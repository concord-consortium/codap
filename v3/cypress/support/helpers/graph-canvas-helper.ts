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
  setAxisAndRetrieveTileId (attribute: string, axis: "bottom" | "left", collectionName?: string) {
    cy.log(`Set ${attribute} on ${axis} axis`)
    ah.openAxisAttributeMenu(axis)
    if (collectionName) {
      ah.selectSubmenuAttribute(attribute, collectionName, axis)
    } else {
      ah.selectMenuAttribute(attribute, axis)
    }
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
  // Helper function to retrieve the position of a PixiPoint
  // Useful for debugging and validating point positions
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
  },
   // Checks if the points in a graph have unique positions.
   // @param {string} tileId - The ID of the graph tile to check.
  checkPointsHaveUniquePositions(tileId: string) {
    cy.window().then((win: any) => {
      const pixiPoints = win.pixiPointsMap[tileId]

      if (!pixiPoints?.length) {
        throw new Error(`PixiPoints for Tile ID ${tileId} are undefined or empty.`)
      }

      // Collect all point positions
      const positions = pixiPoints[0].points.map((point: any) => point.position)

      // Log the positions for debugging
      positions.forEach((pos: { x: number
        ; y: number }, index: number) => {
        cy.log(`Point ${index}: x=${pos.x}, y=${pos.y}`)
      })

      // Verify positions are not the same
      const uniquePositions = new Set(positions.map((pos: { x: number; y: number }) => `${pos.x}-${pos.y}`))
      cy.log(`Total points: ${positions.length}, Unique positions: ${uniquePositions.size}`)

      // Assert all points have unique positions
      expect(uniquePositions.size).to.equal(positions.length, "All points should have unique positions")
    })
  },
  // Check if a specific point matches the expected x and y coordinates
  checkPointPosition(tileId: string, pointIndex: number, expectedX: number, expectedY: number) {
    cy.log(
      `Checking Point Position - Tile ID: ${tileId}, Index: ${pointIndex}, X: ${expectedX}, Y: ${expectedY}`
      )

    cy.window().then((win: any) => {
      const pixiPoints = win.pixiPointsMap[tileId]

      if (!pixiPoints?.length) {
        throw new Error(`PixiPoints for Tile ID ${tileId} are undefined or empty.`)
      }

      // Get the point at the specified index
      const point = pixiPoints[0]?.points[pointIndex]
      if (!point) {
        throw new Error(`Point at index ${pointIndex} is undefined for tile ID ${tileId}.`)
      }

      // Get the actual position
      const actualX = point.position?.x
      const actualY = point.position?.y

      cy.log(`Actual Position - x=${actualX}, y=${actualY}`)

      // Compare actual and expected positions with a tolerance of 1
      expect(actualX).to.be.closeTo(expectedX, 1, `Expected x-coordinate of point ${pointIndex} to match`)
      expect(actualY).to.be.closeTo(expectedY, 1, `Expected y-coordinate of point ${pointIndex} to match`)
    })
  },
  // Checks if the points in a graph have unique fill colors.
  getPixiPointFillColors(tileId: string): Cypress.Chainable<string[]> {
    cy.log("Get all PixiPoint fill colors from textures")
    return cy.window().then((win: any) => {
      const pixiPoints = win.pixiPointsMap[tileId]
      const textures = pixiPoints[0].textures // Access textures directly from PixiPoints

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
