import { ComponentElements as c } from "../../support/elements/component-elements"
import { CfmElements as cfm } from "../../support/elements/cfm"
import { GraphLegendHelper as glh } from "../../support/helpers/graph-legend-helper"
import { GraphTileElements as graph } from "../../support/elements/graph-tile"
import { TableTileElements as table } from "../../support/elements/table-tile"
import { ToolbarElements as toolbar } from "../../support/elements/toolbar-elements"
import { GraphCanvasHelper as gch } from "../../support/helpers/graph-canvas-helper"
import { AxisHelper as ah } from "../../support/helpers/axis-helper"
import graphRules from '../../fixtures/graph-rules.json'

const plots = graphRules.plots

const arrayOfAttributes = [ "Mammal", "Order", "LifeSpan", "Height", "Mass", "Sleep", "Speed", "Habitat", "Diet" ]

// These tests may be run locally if desired. they can take awhile to run on the cloud
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
  describe("graph point count with point count pixi interaction", () => {
    it("validates point count for univariate graphs with different hierarchies", () => {

      cy.log('opening the map will appear with the correct number of points')

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
    it("checks graph point count for hides and shows selected/unselected cases", () => {
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
  })
  describe("case card graph interaction with point count pixi interaction", () => {
    it("can drag attributes from the case card to the graph and check point count", () => {
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
  describe("graph inspector panel with point count pixi interaction", () => {
    it("shows warning if 'Display Only Selected Cases' is selected and checks point count", () => {
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
    it("shows parent visibility toggles and verifies point count with Show Parent Visibility Toggles selected", () => {
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
    it("should add a banner to the graph when Show Measures for Selection is activated with pixijs interaction", () => {
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
    it.skip("should have correct point count and position with numerical y, categorical x, and right axes", () => {
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Diet", "bottom") // Diet => bottom
      cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".sub-axis-wrapper").should("have.length", 1)
      cy.dragAttributeToTarget("table", arrayOfAttributes[4], "left") // Mass => y axis
      cy.get("[data-testid=graph]").find("[data-testid=axis-left]").find(".sub-axis-wrapper").should("have.length", 1)
      glh.dragAttributeToPlot("Habitat") // Habitat => plot area (legend)
      cy.get("[data-testid=graph]")
        .find("[data-testid=axis-rightCat]")
        .find(".sub-axis-wrapper")
        .should("have.length", 1)
      cy.get("[data-testid=graph]").find("[data-testid=axis-left]").find(".sub-axis-wrapper").should("have.length", 3)
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
      // here we check that some points are in the position we expect
      gch.getGraphTileId().then((tileId: string) => {
        // Known inputs:
        const pointIndex = 3
        const expectedX = 166
        const expectedY = 67

        gch.checkPointPosition(tileId, pointIndex, expectedX, expectedY)
      })
      gch.getGraphTileId().then((tileId: string) => {
        // Known inputs:
        const pointIndex = 8
        const expectedX = 325
        const expectedY = 140

        gch.checkPointPosition(tileId, pointIndex, expectedX, expectedY)
      })
      gch.getGraphTileId().then((tileId: string) => {
        // Known inputs:
        const pointIndex = 20
        const expectedX = 67
        const expectedY = 151

        gch.checkPointPosition(tileId, pointIndex, expectedX, expectedY)
      })
    })
    it("toggles parent visibility and verifies legend updates", () => {
      // Set up a categorical attribute on the x-axis and a hierarchy in the table
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Diet", "bottom") // Diet => x-axis
      table.moveAttributeToParent("Habitat", "newCollection")
      table.getNumOfRows(1).should("contain", 5) // five rows: top, land, water, both, bottom

      // Add Habitat to the legend
      glh.dragAttributeToPlot("Habitat")

      // Show parent toggles
      graph.getHideShowButton().click()
      cy.get("[data-testid=show-parent-toggles]").click()
      cy.wait(500)

      // Count legend items before toggling
      cy.get('g.legend-key').then($itemsBefore => {
        const countBefore = $itemsBefore.length

        // Toggle visibility of a parent (e.g., "land")
        cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button").contains("land").click()
        cy.wait(500)

        // Count legend items after toggling
        cy.get('g.legend-key').then($itemsAfter => {
          const countAfter = $itemsAfter.length
          // The count should decrease if a parent is hidden
          expect(countAfter).to.be.lessThan(countBefore)
        })

        // Optionally, check that the color swatch for "land" is not visible
        cy.get('g.legend-key').contains('text', 'land').should('not.exist')
      })
    })
  })
  describe("graph colors and selection with point count pixi interaction", () => {
    it("checks color of a point with Legend colors", () => {
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Diet", "bottom") // Diet => x-axis
      glh.dragAttributeToPlot("Habitat") // Habitat => plot area
      cy.wait(500) // Wait for the graph to update

      ah.verifyAxisLabel("bottom", "Diet")
      //glh.verifyCategoricalLegend("LifeSpan")

      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })

      graph.getGraphTile() // Ensure graph tile is loaded

      gch.getGraphTileId().then((tileId: string) => {
        gch.getPixiPointFillColors(tileId).then((colors) => {
          cy.log(`Extracted Fill Colors: ${colors}`)
          expect(colors).to.have.length.greaterThan(0)
          colors.forEach((color) => {
            expect(color).to.match(/^#[0-9a-fA-F]{6}$/, "Each color should be a valid hex code")
          })
        })
      })
      cy.log("test for point selection using selection of a category in the legend")

      // Click the "water" legend category
      cy.get('g.legend-key').contains('text', 'water').click()

      // Verify that the corresponding rect has the selected class
      cy.get('g.legend-key').contains('text', 'water')
        .parent()
        .find('rect')
        .should('have.class', 'legend-rect-selected')

      // Optionally, verify only one legend rect is selected
      cy.get('rect.legend-rect-selected').should('have.length', 1)

      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })
    })
    it("checks point selection using color of a point", () => {
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Diet", "bottom") // Diet => x-axis
      cy.wait(500) // Wait for the graph to update

      ah.verifyAxisLabel("bottom", "Diet")
      //glh.verifyCategoricalLegend("LifeSpan")

      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })

      table.moveAttributeToParent("Diet", "newCollection")
      table.getNumOfRows(1).should("contain", 5) // five rows: top, plants, meat, both, bottom
      gch.setAxisAndRetrieveTileId("Diet", "bottom").then((tileId) => {
        gch.validateGraphPointCount(tileId, 3)
      })

      table.getGridCell(2, 2).should("contain", "plants").click()
      graph.getGraphTile() // Ensure graph tile is loaded

      gch.getGraphTileId().then((tileId: string) => {
        gch.getPixiPointFillColors(tileId).then((colors) => {
          cy.log(`Extracted Fill Colors: ${colors}`)
          expect(colors).to.have.length(2) // Verify there are exactly 2 colors
          expect(colors).to.deep.equal(["#4682B4", "#E6805B"]) // Verify the colors are as expected
        })
      })
    })
  })
  describe("checks for graph point position and color with pixi interaction", () => {
    // use this test to debug point positions when running locally
    // skip this on the cloud because it's not necessary
    it.skip("checks position of a point", () => {
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Sleep", "bottom") // Sleep => x-axis
      cy.wait(500) // Wait for the graph to update

      graph.getGraphTile() // Ensure graph tile is loaded

      gch.getGraphTileId().then((tileId: string) => {
        cy.log(`Retrieved Tile ID: ${tileId}`)
        if (!tileId) {
          throw new Error("Tile ID is undefined or null.")
        }

        gch.getPixiPointPosition(tileId, 0).then((position: { x: number
          ; y: number }) => {
          cy.log(`Point 0 Position: x=${position.x}, y=${position.y}`)
        })
      })
    })
    it("checks for point compression interaction", () => {
      // Open Four Seals
      cy.log("Open Four Seals from Hamburger menu")
      cfm.getHamburgerMenuButton().should("exist")
      cfm.getHamburgerMenu().should("not.exist")
      cfm.getHamburgerMenuButton().click()
      cfm.getHamburgerMenu().should("exist")
      cfm.getHamburgerMenu().contains("li", "Open...").click()
      cfm.getHamburgerMenu().should("not.exist")
      cfm.getModalDialog().contains(".modal-dialog-title", "Open")
      cfm.getModalDialog().contains(".tab-selected", "Example Documents")
      cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").should("exist")
      cfm.getModalDialog().contains(".filelist div.selectable", "Four Seals").should("exist")
      cfm.getModalDialog().contains(".filelist div.selectable", "Four Seals").click()
      cfm.getModalDialog().contains(".buttons button", "Open").click()
      cy.wait(1000) // Add wait time only when necessary
      cfm.getModalDialog().should("not.exist")
      cy.get(".codap-component.codap-case-table").contains(".title-bar", "Tracks/Measurements").should("exist")

      // Create a graph
      graph.getGraphTile().click()
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("date", "bottom") // Date => x-axis
      cy.get('[data-testid="axis-legend-attribute-button-bottom"]').eq(0).should("have.text", "date")
      ah.openAxisAttributeMenu("left")
      ah.selectMenuAttribute("animal_id", "left") // animal_id => y-axis
      ah.openAxisAttributeMenu("left")
      ah.treatAttributeAsNumeric("left")
      ah.openAxisAttributeMenu("left")
      ah.treatAttributeAsCategorical("left")

      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
    })
    it("verifies no point compression after drawing categorical legend on x-axis with undo/redo actions", () => {
      // Initial setup: Drag attributes to the x-axis and plot area, respectively
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Diet", "bottom") // Diet => x-axis
      glh.dragAttributeToPlot("Habitat") // Habitat => plot area
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })

      cy.log("test undo/redo for categorical legend with categorical attribute on x axis")
      // Undo add legend to graph and verify removal
      toolbar.getUndoTool().click()
      cy.wait(2500)
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })

      // Redo add legend to graph and verify legend returns
      toolbar.getRedoTool().click()
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
    })
    it("verifies no point compression after drawing categorical legend on y-axis with undo/redo actions", () => {
      // Drag attribute to the y-axis and drag another attribute to the plot area
      ah.openAxisAttributeMenu("left")
      ah.selectMenuAttribute("Diet", "left") // Diet => y-axis
      glh.dragAttributeToPlot("Habitat") // Habitat => plot area

      // Verify axis label and legend
      ah.verifyAxisLabel("left", "Diet")
      // Verify point count
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })

      cy.log("test undo/redo for categorical legend with categorical attribute on y axis")
      // Undo the removal of attributes from axis and legend
      toolbar.getUndoTool().click() // Undo remove from legend
      toolbar.getUndoTool().click() // Undo remove from axis
      cy.wait(2500)
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })

      // Note: Redo button disables in Cypress at this step.
      // The disable doesn't happen in CODAP though.
      // Used force:true so that test can happen.
      toolbar.getRedoTool().click({force: true})
      toolbar.getRedoTool().click({force: true})
      cy.wait(2500)
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
    })
    it("no point compression after drawing categorical legend with numerical attribute on x axis and test undo", () => {
      // Initial setup: Drag attributes to the x-axis and plot area, respectively
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("LifeSpan", "bottom") // LifeSpan => x-axis
      glh.dragAttributeToPlot("Habitat") // Habitat => plot area
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })
      glh.verifyLegendLabel("Habitat")

      cy.log("test undo/redo for categorical legend with numerical attribute on x axis")
      // Undo the removal of attributes
      toolbar.getUndoTool().click() // Undo remove from legend
      toolbar.getUndoTool().click() // Undo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })

      // Redo the removal of attributes
      toolbar.getRedoTool().click({force: true}) // Redo remove from legend
      toolbar.getRedoTool().click({force: true}) // Redo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
    })
    it("no point compression after drawing numeric legend with categorical attribute on x axis and test undo", () => {
      // Initial setup: Drag attributes to the x-axis and plot area, respectively
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("Habitat", "bottom") // Habitat => x-axis
      glh.dragAttributeToPlot("LifeSpan") // LifeSpan => plot area
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })
      glh.verifyLegendLabel("LifeSpan")

      cy.log("test undo/redo for numeric legend with categorical attribute on x axis")
      // Undo the removal of attributes
      toolbar.getUndoTool().click() // Undo remove from legend
      toolbar.getUndoTool().click() // Undo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })

      // Redo the removal of attributes
      toolbar.getRedoTool().click() // Redo remove from legend
      toolbar.getRedoTool().click() // Redo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
    })
    it("no point compression after drawing numeric legend with categorical attribute on y axis and test undo", () => {
      // Drag attribute to the y-axis and drag another attribute to the plot area
      ah.openAxisAttributeMenu("left")
      ah.selectMenuAttribute("Diet", "left") // Diet => y-axis
      glh.dragAttributeToPlot("LifeSpan") // LifeSpan => plot area

      // Verify axis label and legend
      ah.verifyAxisLabel("left", "Diet")
      // Verify point count
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })

      cy.log("test undo/redo for numeric legend with categorical attribute on y axis")
      // Undo the removal of attributes
      toolbar.getUndoTool().click() // Undo remove from legend
      toolbar.getUndoTool().click() // Undo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })

      // Redo the removal of attributes
      toolbar.getRedoTool().click({force: true}) // Redo remove from legend
      toolbar.getRedoTool().click({force: true}) // Redo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
    })
    it("no point compression after drawing numeric legend with numerical attribute on x axis and test undo", () => {
      // Drag attribute to the y-axis and drag another attribute to the plot area
      ah.openAxisAttributeMenu("bottom")
      ah.selectMenuAttribute("LifeSpan", "bottom") // LifeSpan => x-axis
      glh.dragAttributeToPlot("Height") // Height => plot area

      // Verify axis label and legend
      ah.verifyAxisLabel("bottom", "LifeSpan")
      // Verify point count
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })

      cy.log("test undo/redo for numeric legend with numerical attributes on x axis")
      // Undo the removal of attributes
      toolbar.getUndoTool().click() // Undo remove from legend
      toolbar.getUndoTool().click() // Undo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })

      cy.log("test undo/redo for numeric legend with numerical attribute on x axis")
      // Redo the removal of attributes
      // Note: Redo button disables in Cypress at this step.
      // The disable doesn't happen in CODAP though.
      // Used force:true so that test can happen.
      toolbar.getRedoTool().click() // Redo remove from legend
      toolbar.getRedoTool().click() // Redo remove from axis

      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
    })
    it("will draw numeric legend with numerical attribute on y axis and test undo", () => {
      // Drag attribute to the y-axis and drag another attribute to the plot area
      ah.openAxisAttributeMenu("left")
      ah.selectMenuAttribute("LifeSpan", "left") // LifeSpan => y-axis
      glh.dragAttributeToPlot("Height") // Height => plot area

      // Verify axis label and legend
      ah.verifyAxisLabel("left", "LifeSpan")
      // Verify point count
      gch.getGraphTileId().then((tileId) => {
        gch.validateGraphPointCount(tileId, 27) // 27 points in graph
      })

      cy.log("test undo/redo for draw numeric legend with numerical attribute on y axis")
      // Undo the removal of attributes
      toolbar.getUndoTool().click() // Undo remove from legend
      toolbar.getUndoTool().click() // Undo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })

      // Note: Redo button disables in Cypress at this step.
      // The disable doesn't happen in CODAP though.
      // Used force:true so that test can happen.

      // Redo the removal of attributes
      toolbar.getRedoTool().click() // Redo remove from legend
      toolbar.getRedoTool().click() // Redo remove from axis
      // Check point positions are unique
      gch.getGraphTileId().then((tileId: string) => {
        gch.checkPointsHaveUniquePositions(tileId) // Call the helper function
      })
    })
  })
})
