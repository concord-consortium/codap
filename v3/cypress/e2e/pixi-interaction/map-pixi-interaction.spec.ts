import { TableTileElements as table } from "../../support/elements/table-tile"
import { ComponentElements as c } from "../../support/elements/component-elements"
import { MapTileElements as map } from "../../support/elements/map-tile"
import { MapCanvasHelper as mch } from "../../support/helpers/map-canvas-helper"

context("Graph UI with Pixi interaction", () => {
  beforeEach(function () {
    const queryParams = "/#file=examples:Four%20Seals&dashboard&mouseSensor&suppressUnsavedWarning"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  describe("map point count with point count pixi interaction", () => {
    it("validates point count for map data on map component with pixi interaction", () => {
      cy.log('Correct number of points in maps')
      map.getMapTile().click()
      mch.getMapTileId().then((tileId) => {
        mch.validateMapPointCount(tileId, 858)
      })
    })
    it("checks show/hide selected/unselected/all map/filter formula point count with pixi interaction", () => {
      c.selectTile("map", 0)

      cy.log('Hide unselected cases')
      map.selectHideShowButton()
      map.getHideSelectedCases().should("have.text", "Hide Selected Cases")
      map.getHideUnselectedCases().should("have.text", "Hide Unselected Cases").click()
      mch.getMapTileId().then((tileId) => {
        mch.validateMapPointCount(tileId, 0)
      })

      cy.log('Show all cases')
      map.selectHideShowButton()
      map.getShowAllCases().should("have.text", "Show All Cases").click()
      mch.getMapTileId().then((tileId) => {
        mch.validateMapPointCount(tileId, 858)
      })

      cy.log('Hide selected cases from a case table')
      table.getNumOfRows(1).should("contain", 6) // six rows: top, 546, 541, 536, 528, bottom
      table.getGridCell(2, 2).should("contain", "546").click()
      c.selectTile("map", 0)
      map.selectHideShowButton()
      map.getHideSelectedCases().should("have.text", "Hide Selected Cases").click()
      mch.getMapTileId().then((tileId) => {
        mch.validateMapPointCount(tileId, 628)
      })
      map.selectHideShowButton()
      map.getShowAllCases().should("have.text", "Show All Cases").click()
      mch.getMapTileId().then((tileId) => {
        mch.validateMapPointCount(tileId, 858)
      })
    //  This is a simple test case for maps with filter formula
    //  This bit can be uncommented with the implementation of
    //  PT-#188411722
    //  cy.log('Case count with filter formula')
    //  c.selectTile("map", 0)
    //  map.selectHideShowButton()
    //  map.getFilterFormulaButton().should("have.text", "Add Filter Formula...").click()
    //  fh.addFilterFormula("animal_id = '546'")
    //  cy.get(".codap-modal-content [data-testid=Apply-button]").should("be.visible").click()
    //  cy.get("[data-testid=Apply-button]").click()
    //  mch.getMapTileId().then((tileId) => {
    //    mch.validateMapPointCount(tileId, 628)
    //  })
    //  map.selectHideShowButton()
    //  map.getShowAllCases().should("have.text", "Show All Cases").click()
    //  mch.getMapTileId().then((tileId) => {
    //    mch.validateMapPointCount(tileId, 858)
    //  })
    })
  })
  describe("map colors and selection with pixi interaction", () => {
    it("validates point selection for map data on map component with pixi interaction", () => {
      table.getGridCell(2, 2).should("contain", "546").click()

      cy.log('Correct highlighting when points are selected')
      map.getMapTile().click()
      mch.getMapTileId().then((tileId) => {
        mch.validateMapPointCount(tileId, 858)
      })

      mch.getMapTileId().then((tileId: string) => {
        mch.getPixiPointFillColors(tileId).then((colors) => {
          const lowerCaseColors = colors.map(color => color.toLowerCase()) // Convert all colors to lowercase
          cy.log(`Extracted Fill Colors (Lowercase): ${lowerCaseColors}`)
          expect(lowerCaseColors).to.have.length(2) // Verify there are exactly 2 colors
          expect(lowerCaseColors).to.deep.equal(["#e6805b", "#4682b4"]) // Verify the colors are as expected
        })
      })
    })
    // This is a simple test case for maps with legends
    // we'd need to get the target drag working for this to work
    // it("validates map color data on map legend plot with pixi interaction", () => {
    //   cy.dragAttributeToTarget("animal_id", "color", "map")

    //   cy.log('Correct highlighting when points are selected')
    //   map.getMapTile().click()
    //   mch.getMapTileId().then((tileId) => {
    //     mch.validateMapPointCount(tileId, 858)
    //   })

    //   mch.getMapTileId().then((tileId: string) => {
    //     mch.getPixiPointFillColors(tileId).then((colors) => {
    //       const lowerCaseColors = colors.map(color => color.toLowerCase()) // Convert all colors to lowercase
    //       cy.log(`Extracted Fill Colors (Lowercase): ${lowerCaseColors}`)
    //       expect(lowerCaseColors).to.have.length(2) // Verify there are exactly 2 colors
    //       expect(lowerCaseColors).to.deep.equal(["#e6805b", "#4682b4"]) // Verify the colors are as expected
    //     })
    //   })
    // })
  })
})
