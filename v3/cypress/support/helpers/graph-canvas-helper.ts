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
  // getPixiPointFillColorHardcoded(tileId: string, pointIndex: number): Cypress.Chainable<{ fill?: string }> {
  //   cy.log("Get the PixiPoint fill color (manual inspection)");
  //   return cy.window().then((win: any) => {
  //     const pixiPoints = win.pixiPointsMap[tileId];
  //     const textures = pixiPoints[0].textures; // Access textures directly from PixiPoints

  //     // Log basic info for debugging
  //     cy.log("PixiPoints:", pixiPoints);
  //     cy.log("Textures Object (Type):", typeof textures);

  //     if (!textures) {
  //       throw new Error("Textures object is undefined.");
  //     }

  //     // Check if textures is a Map-like structure
  //     if (typeof textures.entries === "function") {
  //       const textureEntries = Array.from(textures.entries());
  //       cy.log("Texture Entries (from Map):", textureEntries);

  //       // Manually log all entries to inspect them
  //       textureEntries.forEach(([key, entry], index) => {
  //         cy.log(`Texture Entry ${index} Key:`, key);
  //         cy.log(`Texture Entry ${index} Properties:`, {
  //           fill: entry.fill,
  //           style: entry.style,
  //         });
  //       });

  //       // Attempt to retrieve the first texture's fill property
  //       const [textureKey, textureEntry] = textureEntries[0] || [];
  //       if (!textureEntry) {
  //         throw new Error(`Texture entry for key ${textureKey} is not found.`);
  //       }

  //       const fillColor = textureEntry.fill || textureEntry.style?.fill;
  //       cy.log("Fill Color (From Map):", fillColor);

  //       if (!fillColor) {
  //         throw new Error("Fill color is undefined in the texture entry.");
  //       }

  //       return cy.wrap({ fill: fillColor });
  //     }

  //     // Handle case where textures is an object
  //     const textureKeys = Object.keys(textures);
  //     cy.log("Texture Keys (from Object):", textureKeys);

  //     textureKeys.forEach((key, index) => {
  //       const entry = textures[key];
  //       cy.log(`Texture Entry ${index} Key:`, key);
  //       cy.log(`Texture Entry ${index} Properties:`, {
  //         fill: entry.fill,
  //         style: entry.style,
  //       });
  //     });

  //     const textureKey = textureKeys[0];
  //     if (!textureKey) {
  //       throw new Error("No texture keys found in the textures object.");
  //     }

  //     const textureEntry = textures[textureKey];
  //     if (!textureEntry) {
  //       throw new Error(`Texture entry for key ${textureKey} is not found.`);
  //     }

  //     const fillColor = textureEntry.fill || textureEntry.style?.fill;
  //     cy.log("Fill Color (From Object):", fillColor);

  //     if (!fillColor) {
  //       throw new Error("Fill color is undefined in the texture entry.");
  //     }

  //     return cy.wrap({ fill: fillColor });
  //   });
  // }
}
