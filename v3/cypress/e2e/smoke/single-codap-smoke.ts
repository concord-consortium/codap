import { ComponentElements as c } from "../../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../../support/elements/toolbar-elements"
import { TableTileElements as table } from "../../support/elements/table-tile"
import { GraphTileElements as graph } from "../../support/elements/graph-tile"
import { MapTileElements as map } from "../../support/elements/map-tile"
import { SliderTileElements as slider } from "../../support/elements/slider-tile"
import { CalculatorTileElements as calculator } from "../../support/elements/calculator-tile"
import { WebViewTileElements as webView } from "../../support/elements/web-view-tile"
import { CfmElements as cfm } from "../../support/elements/cfm"
import { AxisHelper as ah } from "../../support/helpers/axis-helper"


context("codap single smoke test", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor&noEntryModal&suppressUnsavedWarning`
    cy.visit(url)
  })

  it("verify Mammals opens from Hamburger menu and tests graph and table functionality", () => {
    cy.log("Open Mammals from Hamburger menu")
    // hamburger menu is hidden initially
    cfm.getHamburgerMenuButton().should("exist")
    cfm.getHamburgerMenu().should("not.exist")
    // hamburger menu is shows when button is clicked
    cfm.getHamburgerMenuButton().click()
    cfm.getHamburgerMenu().should("exist")
    // clicking Open... item closes menu and shows Open dialog
    cfm.getHamburgerMenu().contains("li", "Open...").click()
    cfm.getHamburgerMenu().should("not.exist")
    cfm.getModalDialog().contains(".modal-dialog-title", "Open")
    // Example Documents should be selected by default
    cfm.getModalDialog().contains(".tab-selected", "Example Documents")
    cfm.getModalDialog().contains(".filelist div.selectable", "Four Seals").should("exist")
    cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").should("exist")
    // Selecting Mammals document should load the Mammals example document
    cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").click()
    cfm.getModalDialog().contains(".buttons button", "Open").click()
    cy.wait(1000)
    // once loaded, Open dialog should be hidden and document content should be shown
    cfm.getModalDialog().should("not.exist")
    cy.get(".codap-component.codap-case-table").contains(".title-bar", "Mammals").should("exist")

    cy.log("Test table functionalities in Mammals sample doc")
    cy.log("verify columns exist")
    // css width specification caused grid virtualization to only have 9 attributes in the DOM
    table.getColumnHeaders().should("have.length.be.within", 9, 10)
    table.getColumnHeader(0).invoke("text").then(columnName => {
      // const columnNameArr = columnName.split()
      table.getColumnHeader(0).click({ force: true })
      // table.getColumnHeaderTooltip().should("contain", columnNameArr[0])
    })
    table.getColumnHeader(1).invoke("text").then(columnName => {
      table.getColumnHeader(1).click({ force: true })
    })
    table.getAttribute("Order").should('be.visible').and("have.text", "Order")
    table.getAttribute("LifeSpan").should('be.visible').and('have.text', 'LifeSpan(years)')

    cy.log("verify grid cells exist")
    table.getGridCell(2, 2).should('be.visible').and("contain", "African Elephant")
    table.getGridCell(4, 4).should('be.visible').and("contain", "19")
    table.getNumOfRows().should('eq', '29') // 27 cases, plus the empty row and top row

    cy.log("verify selecting cases in the table")
    table.getGridCell(2, 2).should("contain", "African Elephant").click()
    table.getGridCell(2, 2).should('have.attr', 'aria-selected', 'true')
    // TODO: Add more thorough checks to make sure graph points and table rows actually
    // change color when selected, once Cypress is configured to interact with the PixiJS canvas.
    // For now, we just check that the buttons in table are enabled upon selection.

    cy.log("test graph axis functionalities in Mammals sample doc")
    // it is possible to create a graph
    cy.dragAttributeToTarget("table", "Speed", "left")
    cy.get('[data-testid="axis-legend-attribute-button-left"]').eq(0).should("have.text", "Speed")
    cy.get("[data-testid=graph]").find("[data-testid=axis-left]").find(".tick").should("have.length", 25)

    cy.log("test creating parent collections")
    // NOTE: the graph compresses to a single point in Cypress here.
    // This is a known issue and seems tied to just the Mammals example dataset (PT-#188415914)
    table.moveAttributeToParent("Habitat", "newCollection")
    table.getNumOfRows(1).should("contain", 5) // five rows: top, land, water, both, bottom
    table.moveAttributeToParent("Diet", "newCollection")
    table.getNumOfRows(1).should("contain", 5) // five rows: top, plants, meat, both, bottom

    cy.log("Delete all cases from the hierarchical table and verify the cases delete.")
    c.selectTile("table", 0)
    table.getDeleteCasesButton().click()
    table.getDeleteMenuItem("Delete All Cases").click()
    table.getNumOfRows(1).should("not.contain", 1) // there should only be the input row
  })
  it("verify Four Seals opens from Hamburger menu and test table functionality", () => {
    // Open Four Seals
    cy.log("Open Four Seals from Hamburger menu")
    // hamburger menu is hidden initially
    cfm.getHamburgerMenuButton().should("exist")
    cfm.getHamburgerMenu().should("not.exist")
    // hamburger menu is shows when button is clicked
    cfm.getHamburgerMenuButton().click()
    cfm.getHamburgerMenu().should("exist")
    // clicking Open... item closes menu and shows Open dialog
    cfm.getHamburgerMenu().contains("li", "Open...").click()
    cfm.getHamburgerMenu().should("not.exist")
    cfm.getModalDialog().contains(".modal-dialog-title", "Open")
    // Example Documents should be selected by default
    cfm.getModalDialog().contains(".tab-selected", "Example Documents")
    cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").should("exist")
    cfm.getModalDialog().contains(".filelist div.selectable", "Four Seals").should("exist")
    // Selecting Four Seals document should load the Four Seals example document
    cfm.getModalDialog().contains(".filelist div.selectable", "Four Seals").click()
    cfm.getModalDialog().contains(".buttons button", "Open").click()
    cy.wait(1000)
    // once loaded, Open dialog should be hidden and document content should be shown
    cfm.getModalDialog().should("not.exist")
    cy.get(".codap-component.codap-case-table").contains(".title-bar", "Tracks/Measurements").should("exist")

    cy.log("Test date display exists in table")
    cy.get('button[data-testid="codap-attribute-button date"]').should('exist')
    table.getGridCell(2, 3, 2).should('be.visible').and("contain", "5/23/2005")

    cy.log("Test date display in bottom axis of graph")
    ah.verifyDefaultAxisLabel("bottom")
    ah.openAxisAttributeMenu("bottom")
    ah.selectSubmenuAttribute("date", "Measurements", "bottom") // Date => x-axis
    cy.get('[data-testid="axis-legend-attribute-button-bottom"]').eq(0).should("have.text", "date")
    // Check that the date axis contains the year '2005'
    cy.get('[data-testid="axis-bottom"]')
      .find('text')
      .contains('2005')
      .should('exist')

    // Check the number of tick marks on axis (e.g., ensuring there are 9 months: May to Jan)
    cy.get('[data-testid="axis-bottom"]')
      .find('text')
      .should('have.length', 10) // Adjust this if the expected number changes (currently 9 + ghost div=10)

    cy.log("checks map component")
    c.getComponentTitle("map").should("have.text", "Measurements")
    cy.get('.leaflet-container').should('exist') // Ensure the map container is ready
    // PixiPoint checks for maps are in map-pixi-interaction.spec.ts
  })
  it("verify an empty CODAP document appears and components open", () => {
    cy.log("verifies that toolshelf items open")
    // graphs with no associated data set should not have a title but show a blank space when hovered
    // So we test this here before we create a new data set
    cy.log("will open a blank graph")
    c.clickIconFromToolShelf("graph")
    c.getComponentTitleBar("graph").trigger("mouseover")
    c.getComponentTitle("graph").should("have.text", "_____")
    c.closeComponent("graph")

    cy.log("will open a new table")
    c.clickIconFromToolShelf("table")
    toolbar.getNewCaseTable().click()
    table.getCollection().should("be.visible")
    c.getComponentTitleInput("table").should("have.value", "New Dataset").type("{enter}")
    c.getIconFromToolShelf("table").click()
    toolbar.getDatasetListedInToolShelf("New Dataset").should("be.visible")
    c.closeComponent("table")

    cy.log("will open a graph with new dataset")
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile().should("be.visible")
    c.getComponentTitle("graph").should("have.text", "Cases")
    c.closeComponent("graph")

    cy.log("will open a map")
    c.clickIconFromToolShelf("map")
    map.getMapTile().should("be.visible")
    c.getComponentTitle("map").should("have.text", "Map")
    cy.get('.leaflet-container').should('exist') // Ensure the map container is ready
    c.closeComponent("map")

    cy.log("will open a slider")
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
    c.closeComponent("slider")

    cy.log("will open a calculator")
    c.clickIconFromToolShelf("calc")
    calculator.getCalculatorTile().should("be.visible")
    c.getComponentTitle("calculator").should("have.text", "Calculator")
    c.closeComponent("calculator")

    cy.log("plugin menu works")
    c.getIconFromToolShelf("plugins").should("exist").click()
    toolbar.getPluginSelection().should("have.length", 9)
    webView.getTitle().should("not.exist")
    toolbar.getPluginSelection().eq(0).click()
    webView.getTitle().should("have.text", "Sampler")
    toolbar.getPluginSelection().should("not.exist")
  })

  it("verify no console errors during table flattening and legend operations", () => {
    // Set up console error monitoring
    cy.window().then((win) => {
      cy.stub(win.console, 'error').as('consoleError')
      cy.stub(win.console, 'warn').as('consoleWarn')
    })

    // Open Mammals document
    cy.log("Open Mammals from Hamburger menu")
    cfm.getHamburgerMenuButton().click()
    cfm.getHamburgerMenu().contains("li", "Open...").click()
    cfm.getModalDialog().contains(".filelist div.selectable", "Mammals").click()
    cfm.getModalDialog().contains(".buttons button", "Open").click()
    cy.wait(1000)

    // Create hierarchical table
    cy.log("Create hierarchical table")
    table.moveAttributeToParent("Habitat", "newCollection")
    table.getNumOfRows(1).should("contain", 5)
    table.moveAttributeToParent("Diet", "newCollection")
    table.getNumOfRows(1).should("contain", 5)

    // Flatten the table by dragging attributes back
    cy.log("Flatten the table")
    cy.dragAttributeToTarget("table", "Habitat", "headerDivider")
    cy.dragAttributeToTarget("table", "Diet", "headerDivider")

    // Verify no critical errors in console
    cy.get('@consoleError').then((stub: any) => {
      const errors = stub.getCalls().map((call: any) => call.args[0])
      const criticalErrors = errors.filter((error: any) => {
        if (typeof error === 'string') {
          return error.includes('mobx') ||
            error.includes('TypeError') ||
            error.includes('ReferenceError') ||
            error.includes('Uncaught')
        }
        return false
      })
      cy.wrap(criticalErrors).should('be.empty')
    })

    // Verify no critical warnings in console
    cy.get('@consoleWarn').then((stub: any) => {
      const warnings = stub.getCalls().map((call: any) => call.args[0])
      const criticalWarnings = warnings.filter((warning: any) => {
        if (typeof warning === 'string') {
          return warning.includes('mobx') ||
            warning.includes('TypeError') ||
            warning.includes('ReferenceError') ||
            warning.includes('Uncaught')
        }
        return false
      })
      cy.wrap(criticalWarnings).should('be.empty')
    })
  })
})
