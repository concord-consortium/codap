// import * as PIXI from "pixi.js"
import { GraphTileElements as graph } from "../../support/elements/graph-tile"
import { TableTileElements as table } from "../../support/elements/table-tile"
import { ComponentElements as c } from "../../support/elements/component-elements"
//import { ToolbarElements as toolbar } from "../../support/elements/toolbar-elements"
import { CfmElements as cfm } from "../../support/elements/cfm"
//import { ColorPickerPaletteElements as cpp} from "../../support/elements/color-picker-palette"
import { GraphCanvasHelper as gch } from "../../support/helpers/graph-canvas-helper"
import { AxisHelper as ah } from "../../support/helpers/axis-helper"
import graphRules from '../../fixtures/graph-rules.json'

const plots = graphRules.plots

//these tests may be run locally if desired. they can take awhile for on the cloud
context.skip("Test graph plot transitions", () => {
  beforeEach(function () {
    const queryParams = "?mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cfm.openLocalDoc("cypress/fixtures/3TableGroups.codap")
    cy.wait(2500)
  })

  plots.forEach(test => {
    it(`${test.testName}`, () => {
      c.getIconFromToolShelf("graph").click()
      c.moveComponent("graph", 1000)
      test.axes.forEach(hash => {
        hash.checks.forEach(check => {
          cy.checkDragAttributeHighlights("table", hash.attribute, check.axis, check.active)
        })
        cy.dragAttributeToTarget("table", hash.attribute, hash.target)
        cy.wait(2000)
      })
    })
  })
})

context("Graph UI with Pixi interaction", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  describe("graph view", () => {
    it("validates point count for univariate graphs with different hierarchies with pixi interaction", () => {
      cy.log('Correct number of points in univariate graphs with missing data in cases')

      cy.log('Test for "Mass" univariate (27 points)')
      gch.setAxisAndRetrieveTileId("Mass", "bottom").then((tileId) => {
          gch.validateGraphPointCount(tileId, 27)
      })

      cy.log('Test for "Sleep" univariate (24 points)')
      gch.setAxisAndRetrieveTileId("Sleep", "bottom").then((tileId) => {
          gch.validateGraphPointCount(tileId, 24)
      })

      cy.log('Test for "Diet" univariate with hierarchy (3 points)')
      // Drag Diet to parent in case table
      table.moveAttributeToParent("Diet", "newCollection")
      table.getNumOfRows(1).should("contain", 5) // five rows: top, plants, meat, both, bottom
      gch.setAxisAndRetrieveTileId("Diet", "bottom").then((tileId) => {
        gch.validateGraphPointCount(tileId, 3)
      })

      cy.log('Test for "Diet", "Habitat" univariate with hierarchy (5 points)')
      table.moveAttributeToParent("Habitat", "newCollection")
      table.getNumOfRows(1).should("contain", 5) // five rows: top, land, water, both, bottom
      gch.setAxisAndRetrieveTileId("Diet", "bottom").then((tileId) => {
        gch.validateGraphPointCount(tileId, 5)
      })
    })
    it("Checks count for hides and shows selected/unselected cases with pixijs interaction", () => {
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Sleep", "bottom") // Sleep => x-axis
      cy.wait(500)
      graph.getGraphTile()

      // Hide all cases
      cy.log('Hide all cases in graph')
      graph.getHideShowButton().click()
      cy.get("[data-testid=hide-selected-cases]").should("be.disabled")
      cy.get("[data-testid=hide-unselected-cases]").click()
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 0) // 0 points in graph
      })

      // Show all cases
      cy.log('Show all cases in graph')
      graph.getGraphTile()
      graph.getHideShowButton().click()
      cy.get("[data-testid=hide-selected-cases]").should("be.disabled")
      cy.get("[data-testid=show-all-cases]").click()
      cy.wait(500)
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 24) // 24 points in graph
      })

      cy.log('Hide selected cases in graph')
      table.moveAttributeToParent("Diet", "newCollection")
      table.getNumOfRows(1).should("contain", 5) // five rows: top, plants, meat, both, bottom
      table.getGridCell(2, 2).should("contain", "plants").click()
      graph.getGraphTile().click()
      graph.getHideShowButton().click()
      cy.get("[data-testid=hide-selected-cases]").should("not.be.disabled").click()
      cy.wait(500)
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 18) // 18 points in graph
      })
    })
    // it.skip("should highlight a selected graph point with pixi interaction", () => {
    //   // this is a spike to get interaction with point selection and texture
    //   // it makes use of the texture call in the pixiPoint
    //   // However, I'm pretty sure I've got the structure of the array wrong
    //   // this code tries to log and verify the selected case ID and see how it
    //   // interacts with the pixiPoint array

    //   /**
    //    * Helper function to check if a graph point is selected.
    //    * @param pointMetadata - The `pointMetadata` map from `pixiPoints`.
    //    * @param selectedCaseID - The case ID of the selected point.
    //    * @param expectedColor - The expected color of the selected point.
    //    * @returns True if the point matches the expected color, false otherwise.
    //    */
    //   const isPointSelected = (pointMetadata: Map<any, any>,
    //     selectedCaseID: string, expectedColor: string): boolean => {
    //     // Find the entry in `pointMetadata` matching the `selectedCaseID`
    //     const selectedEntry = Array.from(pointMetadata.values()).find(
    //       (entry: any) => entry.caseID === selectedCaseID
    //     )
    //     if (!selectedEntry) {
    //       console.log('No entry found for selected case ID:', selectedCaseID)
    //       return false
    //     }
    //     console.log('Selected Entry:', selectedEntry)

    //     // Check if the `style.fill` matches the expected color
    //     const fillColor = selectedEntry.style?.fill
    //     console.log('Extracted Fill Color:', fillColor)
    //     return fillColor === expectedColor
    //   }

    //   // Select the target table cell and dynamically retrieve the caseID
    //   table.getGridCell(2, 2)
    //     .should("contain", "African Elephant")
    //     .invoke('attr', 'data-row-id')
    //     .then((selectedCaseID) => {
    //       cy.log('Selected Case ID:', selectedCaseID)

    //       // Verify the graph's component title matches the collection name
    //       c.getComponentTitle("graph").should("contain", collectionName)

    //       // Re-click the table cell to ensure interaction consistency
    //       table.getGridCell(2, 2).click({ force: true })

    //       // Locate the graph and retrieve its dynamic tile ID
    //       cy.get('[data-testid=codap-graph]')
    //         .parents('.free-tile-component')
    //         .invoke('attr', 'id')
    //         .then((tileId) => {
    //           if (!tileId) {
    //             throw new Error("tileId is undefined or null.")
    //           }
    //           cy.log(`Graph Tile ID Retrieved: ${tileId}`)

    //           // Access PIXI metadata
    //           cy.window().then((win: any) => {
    //             const pixiPoints = win.pixiPointsMap[tileId]
    //             cy.log('Full Pixi Points Object:', pixiPoints)

    //             // Verify pixiPoints exists
    //             expect(pixiPoints[0], 'Pixi points should exist').to.exist

    //             // Access `pointMetadata`
    //             const pointMetadata = pixiPoints[0].pointMetadata
    //             cy.log('Point Metadata Map:', pointMetadata)

    //             // Verify the point is highlighted
    //             const selectedColor = "#4682B4" // Expected color for a selected point
    //             const isSelected = isPointSelected(pointMetadata, selectedCaseID, selectedColor)

    //             expect(isSelected, `Point with case ID ${selectedCaseID} should be highlighted`).to.be.true
    //           })
    //         })
    //     })
    // })
  })
  describe("case card graph interaction", () => {
    it("can drag attributes from the case card to the graph with pixijs interaction", () => {
      const tableHeaderLeftSelector = ".codap-component.codap-case-table .component-title-bar .header-left"
      cy.get(tableHeaderLeftSelector).click()
      cy.get(`${tableHeaderLeftSelector} .card-table-toggle-message`).click()
      cy.wait(500)
      cy.dragAttributeToTarget("card", "Speed", "left")
      cy.wait(500)
      cy.get('[data-testid="axis-legend-attribute-button-left"]').should("have.text", "Speed")
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 24) // 24 points in graph
      })
    })
  })
  describe("graph inspector panel with pixijs interaction", () => {
    it("shows warning if 'Display Only Selected Cases' is selected and no cases have been selected with pixijs", () => {
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Sleep", "bottom") // Sleep => x-axis
      cy.wait(500)
      cy.get("[data-testid=display-only-selected-warning]").should("not.exist")
      graph.getHideShowButton().click()
      cy.get("[data-testid=display-selected-cases]").click()
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 0) // 0 points in graph
      })
      // The warning is made up of six individual strings rendered in their own separate text elements
      cy.get("[data-testid=display-only-selected-warning]").should("exist").and("have.length", 6)
      graph.getHideShowButton().click()
      // Resorting to using force: true because the option's parent is reported as hidden in CI but not locally.
      cy.get("[data-testid=show-all-cases]").click({force: true})
      cy.get("[data-testid=display-only-selected-warning]").should("not.exist")
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 24) // 24 points in graph
      })
    })
    it("shows parent visibility toggles when Show Parent Visibility Toggles option is selected with pixijs", () => {
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Sleep", "bottom") // Sleep => x-axis
      cy.wait(500)
      cy.get("[data-testid=parent-toggles-container]").should("not.exist")
      graph.getHideShowButton().click()
      cy.wait(500)
      cy.get("[data-testid=show-parent-toggles]").should("exist").and("have.text", "Show Parent Visibility Toggles")
      cy.get("[data-testid=show-parent-toggles]").click()
      cy.wait(500)
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 24) // 24 points in graph
      })
      cy.get("[data-testid=parent-toggles-container]").should("exist")
      cy.get("[data-testid=parent-toggles-all]").should("exist").and("have.text", "Hide All –")
      cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button").should("exist").and("have.length", 27)
      cy.get("[data-testid=parent-toggles-last]").should("exist").and("have.text", "☐ Last")
      cy.get("[data-testid=graph]").click()
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Spotted Hyena").should("exist").and("not.have.class", "case-hidden")
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Spotted Hyena").click()
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Spotted Hyena").should("have.class", "case-hidden")
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 23) // 23 points in graph
      })
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Spotted Hyena").click()
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Spotted Hyena").should("not.have.class", "case-hidden")
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 24) // 24 points in graph
      })
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Red Fox").should("exist").and("be.visible")
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Owl Monkey").should("exist").and("not.be.visible")
      cy.get("[data-testid=parent-toggles-case-buttons-left]").should("exist")
      cy.get("[data-testid=parent-toggles-case-buttons-right]").should("not.exist")
      cy.get("[data-testid=parent-toggles-case-buttons-left]").click()
      cy.wait(250)
      cy.get("[data-testid=parent-toggles-case-buttons-right]").should("exist")
      cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button")
        .contains("Red Fox").should("exist").and("not.be.visible")
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Owl Monkey").should("exist").and("be.visible")
      cy.get("[data-testid=parent-toggles-case-buttons-right]").click()
      cy.wait(250)
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Red Fox").should("exist").and("be.visible")
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Gray Wolf").should("exist").and("not.be.visible")
      cy.get("[data-testid=parent-toggles-last]").click()
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 1) // 1 point in graph
      })
      cy.wait(250)
      cy.get("[data-testid=parent-toggles-last]").should("have.text", "☒ Last")
      cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button").then((buttons) => {
        const lastButtonIndex = buttons.length - 1
        buttons.each((i: number, button: HTMLButtonElement) => {
          if (i !== lastButtonIndex) {
            cy.wrap(button).should("have.class", "case-hidden")
          } else {
            cy.wrap(button).should("not.have.class", "case-hidden")
          }
        })
      })
      cy.get("[data-testid=parent-toggles-all]").should("have.text", "Show All –")
      cy.get("[data-testid=parent-toggles-all]").click()
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 24) // 24 points in graph
      })
      cy.wait(500)
      cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button").each((button: HTMLButtonElement) => {
        cy.wrap(button).should("not.have.class", "case-hidden")
      })
      cy.get("[data-testid=parent-toggles-last]").should("have.text", "☐ Last")
      cy.get("[data-testid=parent-toggles-all]").should("have.text", "Hide All –")
      cy.get("[data-testid=parent-toggles-last]").click()
      cy.wait(250)
      cy.get("[data-testid=parent-toggles-last]").should("have.text", "☒ Last")
      cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button").contains("Red Fox").click()
      cy.get("[data-testid=parent-toggles-last]").should("have.text", "☐ Last")
      // TODO: Figure out why the below doesn't work in Cypress -- some buttons aren't being set to 'case-hidden' when
      // Hide All is clicked. It seems to work fine in a web browser, though.
      // cy.get("[data-testid=parent-toggles-all]").should("have.text", "Show All –").click()
      // cy.get("[data-testid=parent-toggles-all]").should("have.text", "Hide All –").click()
      // cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button").each((button: HTMLButtonElement) => {
      //   cy.wrap(button).should("have.class", "case-hidden")
      // })
      cy.get("[data-testid=parent-toggles-all]").should("have.text", "Show All –")
      cy.get("[data-testid=parent-toggles-all]").click()
      cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button").each((button: HTMLButtonElement) => {
        cy.wrap(button).should("not.have.class", "case-hidden")
      })
      graph.getHideShowButton().click()
      cy.wait(500)
      cy.get("[data-testid=show-parent-toggles]").should("exist").and("have.text", "Hide Parent Visibility Toggles")
      cy.get("[data-testid=show-parent-toggles]").click()
      cy.get("[data-testid=parent-toggles]").should("not.exist")
      graph.getHideShowButton().click()
      cy.wait(500)
      cy.get("[data-testid=show-parent-toggles]").should("exist").and("have.text", "Show Parent Visibility Toggles")
    })

    it("adds a banner to the graph when Show Measures for Selection is activated with pixijs interaction", () => {
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Sleep", "bottom") // Sleep => x-axis
      cy.get("[data-testid=measures-for-selection-banner]").should("not.exist")
      graph.getHideShowButton().click()
      cy.wait(500)
      cy.get("[data-testid=show-selection-measures]").click()
      cy.wait(500)
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 24) // 24 points in graph
      })
      cy.get("[data-testid=measures-for-selection-banner]")
        .should("exist").and("have.text", "Showing measures for 0 selected cases")
      graph.getHideShowButton().click()
      cy.wait(500)
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 24) // 24 points in graph
      })
      cy.get("[data-testid=show-selection-measures]").click()
      cy.wait(500)
      cy.get("[data-testid=measures-for-selection-banner]").should("not.exist")
    })

    // NOTE: Adornments are covered in graph-adornments.spec.ts (including Show Measures)
  })
})
