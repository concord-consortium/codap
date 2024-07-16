import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { TableTileElements as table } from "../support/elements/table-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { CfmElements as cfm } from "../support/elements/cfm"
import graphRules from '../fixtures/graph-rules.json'

const collectionName = "Mammals"
const newCollectionName = "Animals"
const plots = graphRules.plots

// Skipping this test because Cypress 13 does not support displaying pixijs canvas elements in CI
// https://github.com/cypress-io/cypress/issues/28289
// This test can be unskipped when the above cypress bug is resolved
// (In local, this works fine and the tests can be run successfully)
context.skip("Test graph plot transitions", () => {
  beforeEach(function () {
    const queryParams = "?mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cfm.openLocalDoc("cypress/fixtures/3TableGroups.codap")
    cy.wait(2500)
  })

  plots.forEach(test => {
    it.skip(`${test.testName}`, () => {
      c.getIconFromToolshelf("graph").click()
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

context("Graph UI", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })
  describe("graph view", () => {
    it("updates graph title", () => {
      c.getComponentTitle("graph").should("have.text", collectionName)
      c.changeComponentTitle("graph", newCollectionName)
      c.getComponentTitle("graph").should("have.text", newCollectionName)

      // test for undo/redo when updating graph title
      cy.log("checks for undo/redo when updating a graph title")
      toolbar.getUndoTool().click()
      c.getComponentTitle("graph").should("have.text", collectionName)

      // use force:true so we don't have to worry about redo disabling
      toolbar.getRedoTool().click({force: true})
      c.getComponentTitle("graph").should("have.text", newCollectionName)
    })
    it("tests creating graphs with undo/redo", () => {
      // Function to count CODAP graphs and return the count
      const countCodapGraphs = () => {
        return cy.get('.codap-graph').its('length')
      }
      countCodapGraphs().then((initialCount: number) => {
        cy.log(`Initial CODAP Graph Count: ${initialCount}`)

        // perform an action that gets a new graph
        c.getIconFromToolshelf("graph").click()
        // cy.wait(1000)
        c.getComponentTitle("graph").should("contain", collectionName)
        c.getComponentTitle("graph", 1).should("contain", collectionName)
        // Assert the count increased by 1
        countCodapGraphs().should('eq', initialCount + 1)

        // tests for undo after creating a graph
        cy.log("checks for undo/redo when creating graph")
        toolbar.getUndoTool().click()
        countCodapGraphs().should('eq', initialCount)

        // tests for redo of creating a graph
        toolbar.getRedoTool().click()
        countCodapGraphs().should('eq', initialCount + 1)
      })
    })
    it("creates graphs with new collection names when existing ones are closed", () => {
      c.closeComponent("graph")
      c.checkComponentDoesNotExist("graph")
      c.getIconFromToolshelf("graph").click()
      c.getComponentTitle("graph").should("contain", collectionName)

      c.closeComponent("graph")
      c.checkComponentDoesNotExist("graph")
      c.getIconFromToolshelf("graph").click()
      c.getComponentTitle("graph").should("contain", collectionName)
    })
    it("checks all graph tooltips", () => {
      c.selectTile("graph", 0)
      toolbar.getToolShelfIcon("graph").then($element => {
        c.checkToolTip($element, c.tooltips.graphToolShelfIcon)
      })
      c.getMinimizeButton("graph").then($element => {
        c.checkToolTip($element, c.tooltips.minimizeComponent)
      })
      c.getCloseButton("graph").then($element => {
        c.checkToolTip($element, c.tooltips.closeComponent)
      })
      graph.getResizeIcon().then($element => {
        c.checkToolTip($element, c.tooltips.graphResizeButton)
      })
      graph.getHideShowButton().then($element => {
        c.checkToolTip($element, c.tooltips.graphHideShowButton)
      })
      graph.getDisplayValuesButton().then($element => {
        c.checkToolTip($element, c.tooltips.graphDisplayValuesButton)
      })
      graph.getDisplayStylesButton().then($element => {
        c.checkToolTip($element, c.tooltips.graphDisplayStylesButton)
      })
      graph.getCameraButton().then($element => {
        c.checkToolTip($element, c.tooltips.graphCameraButton)
      })
      // The display config button should not appear until the graph is configured to have a univariate plot,
      // i.e. there is a single numeric attribute on either the bottom or left axis.
      graph.getDisplayConfigButton().should("not.exist")
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      cy.wait(500)
      graph.getDisplayConfigButton().should("exist")
      graph.getDisplayConfigButton().then($element => {
        c.checkToolTip($element, c.tooltips.graphDisplayConfigButton)
      })
      cy.dragAttributeToTarget("table", "Speed", "left")
      cy.wait(500)
      graph.getDisplayConfigButton().should("not.exist")
    })
  })
  describe("graph inspector panel", () => {
    it("change points in table and check for autoscale", () => {
      // create a graph with Lifespan (x-axis) and Height (y-axis)
      c.getComponentTitle("graph").should("have.text", collectionName)
      cy.dragAttributeToTarget("table", "LifeSpan", "bottom")
      cy.dragAttributeToTarget("table", "Height", "left")

      // change values in table so that points need rescale
      table.getGridCell(2, 2).should("contain", "African Elephant")
      cy.log("double-clicking the cell")
      // double-click to initiate editing cell
      table.getGridCell(3, 4).dblclick()
      table.getGridCell(3, 4).find("input").type("700{enter}")

      table.getGridCell(2, 2).should("contain", "African Elephant")
      cy.log("double-clicking the cell")
      // double-click to initiate editing cell
      table.getGridCell(3, 5).dblclick()
      table.getGridCell(3, 5).find("input").type("300{enter}")

      // get the rescale button
      c.getComponentTitle("graph").should("have.text", collectionName).click()
      graph.getResizeIcon().click()

      // Checks for axis rescale
      // this check basically just counts the tick marks in the graph but I'm
      // wondering if there's a better way. E.g. if we added a data-testid further
      // in the graph axis it might be possible to check the axis labels or scale
      cy.get("[data-testid=graph]").find("[data-testid=axis-bottom]").find(".tick").should("have.length", 29)
    })
    it("hides and shows selected/unselected cases", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      cy.wait(500)
      // TODO: Add more thorough checks to make sure the cases are actually hidden and shown once Cypress is
      // configured to interact with the PixiJS canvas. For now, we just check that the buttons are disabled
      // and enabled as expected.
      graph.getHideShowButton().click()
      cy.get("[data-testid=hide-selected-cases]").should("be.disabled")
      cy.get("[data-testid=hide-unselected-cases]").should("not.be.disabled")
      cy.get("[data-testid=show-all-cases]").should("be.disabled")
      cy.get("[data-testid=hide-unselected-cases]").click()
      cy.wait(500)
      graph.getHideShowButton().click()
      cy.get("[data-testid=hide-selected-cases]").should("be.disabled")
      cy.get("[data-testid=hide-unselected-cases]").should("be.disabled")
      cy.get("[data-testid=show-all-cases]").should("not.be.disabled")
      cy.get("[data-testid=show-all-cases]").click()
      cy.wait(500)
      graph.getHideShowButton().click()
      cy.get("[data-testid=hide-selected-cases]").should("be.disabled")
      cy.get("[data-testid=hide-unselected-cases]").should("not.be.disabled")
      cy.get("[data-testid=show-all-cases]").should("be.disabled")
    })
    it("displays only selected cases and adjusts axes when 'Display Only Selected Cases' is selected", () => {
      // TODO: Add more thorough checks to make sure cases are actually hidden and shown, and the axes adjust
      // once Cypress is configured to interact with the PixiJS canvas. For now, we just check that the buttons
      // are disabled and enabled as expected.
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      cy.wait(500)
      graph.getHideShowButton().click()
      cy.get("[data-testid=display-selected-cases]").should("not.be.disabled")
      cy.get("[data-testid=show-all-cases]").should("be.disabled")
      cy.get("[data-testid=display-selected-cases]").click()
      cy.wait(500)
      graph.getHideShowButton().click()
      cy.get("[data-testid=display-selected-cases]").should("be.disabled")
      cy.get("[data-testid=show-all-cases]").should("not.be.disabled")
      cy.get("[data-testid=show-all-cases]").click()
      cy.wait(500)
      graph.getHideShowButton().click()
      cy.get("[data-testid=display-selected-cases]").should("not.be.disabled")
      cy.get("[data-testid=show-all-cases]").should("be.disabled")
    })
    it("shows a warning when 'Display Only Selected Cases' is selected and no cases have been selected", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      cy.wait(500)
      cy.get("[data-testid=display-only-selected-warning]").should("not.exist")
      graph.getHideShowButton().click()
      cy.get("[data-testid=display-selected-cases]").click()
      // The warning is made up of six individual strings rendered in their own separate text elements
      cy.get("[data-testid=display-only-selected-warning]").should("exist").and("have.length", 6)
      graph.getHideShowButton().click()
      // Resorting to using force: true because the option's parent is reported as hidden in CI but not locally.
      cy.get("[data-testid=show-all-cases]").click({force: true})
      cy.get("[data-testid=display-only-selected-warning]").should("not.exist")
    })
    it("shows parent visibility toggles when Show Parent Visibility Toggles option is selected", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      cy.wait(500)
      cy.get("[data-testid=parent-toggles-container]").should("not.exist")
      graph.getHideShowButton().click()
      cy.wait(500)
      cy.get("[data-testid=show-parent-toggles]").should("exist").and("have.text", "Show Parent Visibility Toggles")
      cy.get("[data-testid=show-parent-toggles]").click()
      cy.wait(500)
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
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Spotted Hyena").click()
      cy.get("[data-testid=parent-toggles-case-buttons-list]")
        .find("button").contains("Spotted Hyena").should("not.have.class", "case-hidden")
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
      cy.wait(250)
      cy.get("[data-testid=parent-toggles-last]").should("have.text", "☒ Last")
      cy.get("[data-testid=parent-toggles-case-buttons-list]").find("button").then((buttons: HTMLButtonElement[]) => {
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

    it("It adds a banner to the graph when Show Measures for Selection is activated", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      cy.get("[data-testid=measures-for-selection-banner]").should("not.exist")
      graph.getHideShowButton().click()
      cy.wait(500)
      cy.get("[data-testid=show-selection-measures]").click()
      cy.wait(500)
      cy.get("[data-testid=measures-for-selection-banner]")
        .should("exist").and("have.text", "Showing measures for 0 selected cases")
      graph.getHideShowButton().click()
      cy.wait(500)
      cy.get("[data-testid=show-selection-measures]").click()
      cy.wait(500)
      cy.get("[data-testid=measures-for-selection-banner]").should("not.exist")
    })

    // NOTE: Adornments are covered in graph-adornments.spec.ts (including Show Measures)
    it("format panel interactions", () => {
      cy.log("check point size change")

      // get rid of aria-valuenow div in the Slider component
      // by closing the Slider
      c.closeComponent("slider")
      c.checkComponentDoesNotExist("slider")

      // get the graph component
      c.getComponentTitle("graph").should("have.text", collectionName)
      graph.getDisplayStylesButton().click()

      // change point size
      cy.get("[data-testid=point-size-slider]")
        .click({ force: true })
        .type('{downArrow}{downArrow}')
        .wait(500) // wait for animation to finish
        .get('div[role="slider"]').should('have.attr', 'aria-valuenow', "0.98")

      cy.log("changes the stroke color value and verifies the change")

      cy.get('input[type="color"].chakra-input.color-picker-thumb.css-12wa1y3')
        .eq(0)
        .should('have.value', '#ffffff') // Ensure stroke initially has the expected value
        .then((colorPicker) => {
          // Change the value of the color picker
          cy.wrap(colorPicker)
            .invoke('val', '#000000')
            .trigger('input')
            .trigger('change')

          // Verify the value has been updated
          cy.wrap(colorPicker).should('have.value', '#000000')
        })

      cy.log("changes the point color value and verifies the change")

      cy.get('input[type="color"].chakra-input.color-picker-thumb.css-12wa1y3')
        .eq(1)
        .should('have.value', '#e6805b') // Ensure point color initially has the expected value
        .then((colorPicker) => {
          // Change the value of the color picker
          cy.wrap(colorPicker)
            .invoke('val', '#ff5733')
            .trigger('input')
            .trigger('change')

          // Verify the value has been updated
          cy.wrap(colorPicker).should('have.value', '#ff5733')
        })

      cy.log("checks the box Stroke same color as fill and check it")

      // Get the checkbox and check it
      cy.get('span.chakra-checkbox__control.css-4utxuo')
        .eq(0)
        .click()

      // Verify the checkbox is checked
      cy.get('input[type="checkbox"]')
        .should('be.checked')

      // Use Cypress commands to get the first and second color picker elements
      cy.get('input[type="color"].chakra-input.color-picker-thumb.css-12wa1y3')
        .eq(0)
        .as('fillColorPicker')

      cy.get('input[type="color"].chakra-input.color-picker-thumb.css-12wa1y3')
        .eq(1)
        .as('strokeColorPicker')

      // Get the fill color value
      cy.get('@fillColorPicker').invoke('val').then((fillColor) => {
        // Get the stroke color value and compare it to the fill color
        cy.get('@strokeColorPicker')
        .should('have.value', fillColor)
      })

      cy.log("changes the background color and verifies the change")
      // Use a more specific selector to find the background color input element
      cy.get('input[type="color"].chakra-input.color-picker-thumb.css-12wa1y3')
        .eq(2)
        .should('have.value', '#ffffff') // Ensure background initially has the expected value
        .then((backgroundColorPicker) => {
          // Change the value of the background color picker
          cy.wrap(backgroundColorPicker)
            .invoke('val', '#ff5733')
            .trigger('input')
            .trigger('change')

          // Verify the value has been updated
          cy.wrap(backgroundColorPicker).should('have.value', '#ff5733')
        })

      cy.log("finds the Transparent checkbox and verifies it can be checked")
      // Ensure the checkbox label with text "Transparent" is visible
      cy.contains('span.chakra-checkbox__label.css-1e9gfn3', 'Transparent')
        .should('be.visible')
        .parent()
        .within(() => {
          // Find the checkbox input within the same parent and check it
          cy.get('input[type="checkbox"]').check({ force: true })

          // Verify the checkbox is checked
          cy.get('input[type="checkbox"]').should('be.checked')
        })
    })
  })
  describe("graph bin configuration", () => {
    it("disables Point Size control when display type is bars", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      cy.wait(500)
      graph.getDisplayStylesButton().click()
      cy.get("[data-testid=point-size-slider]").should("not.have.attr", "aria-disabled")
      graph.getDisplayConfigButton().click()
      cy.wait(500)
      cy.get("[data-testid=bars-radio-button]").click()
      cy.wait(500)
      graph.getDisplayStylesButton().click()
      cy.get("[data-testid=point-size-slider]").should("have.attr", "aria-disabled", "true")
    })
    it("adds bin boundaries to plot when 'Group into Bins' is selected", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      cy.wait(500)
      cy.get("[data-testid=bin-ticks-graph-1]").should("not.exist")
      graph.getDisplayConfigButton().click()
      cy.wait(500)
      cy.get("[data-testid=bins-radio-button]").click()
      cy.wait(500)
      cy.get("[data-testid=bin-ticks-graph-1]").should("exist")
    })
    it("enables bin width and alignment options when 'Group into Bins' is selected", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      graph.getDisplayConfigButton().click()
      cy.get("[data-testid=graph-bin-width-setting]").should("not.exist")
      cy.get("[data-testid=graph-bin-alignment-setting]").should("not.exist")
      cy.get("[data-testid=bins-radio-button]").click()
      cy.wait(500)
      cy.get("[data-testid=graph-bin-width-setting]").should("exist")
      cy.get("[data-testid=graph-bin-width-setting]").find("label").should("exist").and("have.text", "Bin width")
      cy.get("[data-testid=graph-bin-width-setting]").find("input").should("exist").should("have.value", "2")
      cy.get("[data-testid=graph-bin-alignment-setting]").should("exist")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("label").should("exist").and("have.text", "Alignment")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("exist").should("have.value", "2")
    })
    it("updates bin configuration when bin width and bin alignment values are changed", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      graph.getDisplayConfigButton().click()
      cy.get("[data-testid=bins-radio-button]").click()
      cy.wait(500)
      cy.get("[data-testid=bin-ticks-graph-1]").should("exist")
      cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary").should("have.length", 9)
      cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").should("have.length", 9)
      cy.get("[data-testid=graph-bin-width-setting]").find("input").should("exist").should("have.value", "2")
      cy.get("[data-testid=graph-bin-width-setting]").find("input").clear().type("5")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("exist").should("have.value", "2")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").clear().type("3")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").type("{enter}")
      cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary").should("have.length", 4)
      cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").should("have.length", 4)
    })
    it("reverts bin width and bin alignment to default values for new value range when attribute is changed", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      graph.getDisplayConfigButton().click()
      cy.get("[data-testid=bins-radio-button]").click()
      cy.wait(500)
      cy.get("[data-testid=bin-ticks-graph-1]").should("exist")
      cy.get("[data-testid=graph-bin-width-setting]").find("input").clear().type("5")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").clear().type("3")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").type("{enter}")
      cy.dragAttributeToTarget("table", "Speed", "bottom")
      graph.getDisplayConfigButton().click()
      cy.get("[data-testid=graph-bin-width-setting]").find("input").should("have.value", "20")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("have.value", "0")
    })
    it("allows user to change bin width and alignment values by dragging the bin boundary lines", () => {
      cy.dragAttributeToTarget("table", "Sleep", "bottom")
      graph.getDisplayConfigButton().click()
      cy.get("[data-testid=bins-radio-button]").click()
      cy.wait(500)
      cy.get("[data-testid=bin-ticks-graph-1]").should("exist")
      cy.get("[data-testid=graph-bin-width-setting]").find("input").should("exist").should("have.value", "2")
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").should("exist").should("have.value", "2")
      // focus on the plot area
      cy.get("[data-testid=bin-ticks-graph-1]").click()
      cy.window().then((win: Window) => {
        cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").eq(2)
          .trigger("mousedown", { which: 1, force: true, view: win })
        cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").eq(2)
          .trigger("mousemove", 20, 0, { force: true })
        cy.get("[data-testid=bin-ticks-graph-1]").find("path.draggable-bin-boundary-cover").eq(2)
          .trigger("mouseup", { force: true, view: win })
      })
      graph.getDisplayConfigButton().click()
      cy.get("[data-testid=graph-bin-width-setting]").find("input").invoke("val").then((valueStr: string) => {
        const valueNum = parseFloat(valueStr)
        expect(valueNum).to.be.closeTo(2.75, 0.25)
      })
      cy.get("[data-testid=graph-bin-alignment-setting]").find("input").invoke("val").then((valueStr: string) => {
        const valueNum = parseFloat(valueStr)
        expect(valueNum).to.be.closeTo(4, 0.1)
      })
    })
    it("shows a bar graph for categorical attr on primary axis with 'Fuse Dots into Bars' checked", () => {
      cy.dragAttributeToTarget("table", "Habitat", "bottom")
      cy.get("[data-testid=bar-cover]").should("not.exist")
      graph.getDisplayConfigButton().click()
      cy.get("[data-testid=bar-chart-checkbox]").find("input").should("exist").and("have.attr", "type", "checkbox")
        .and("not.be.checked")
      cy.get("[data-testid=bar-chart-checkbox]").click()
      cy.get("[data-testid=bar-chart-checkbox]").find("input").should("be.checked")
      // TODO: It would be better to check for the exact number of bars,
      // but the number seems to vary depending on whether
      // you're running the test locally or in CI for some mysterious reason.
      // cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 3)
      cy.get("[data-testid=bar-cover]").should("exist")
      cy.get(".axis-wrapper.left").find("[data-testid=attribute-label]").should("exist").and("have.text", "Count")
      cy.get("[data-testid=case-table]").find("[role=row][aria-selected=true]").should("not.exist")
      cy.get("[data-testid=bar-cover]").eq(1).click({ force: true })
      cy.get("[data-testid=case-table]").find("[role=row][aria-selected=true]").should("have.length.greaterThan", 0)
      // TODO: Enable these checks once the number of bars is consistent. See comment above.
      // cy.get("[data-testid=case-table]").find("[role=row][aria-selected=true]").should("have.length", 2)
      // cy.get("[data-testid=bar-cover]").eq(2).click({ shiftKey: true })
      // cy.get("[data-testid=case-table]").find("[role=row][aria-selected=true]").should("have.length", 3)
      cy.dragAttributeToTarget("table", "Diet", "top")
      // TODO: See comment above regarding number of bars.
      // cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 9)
      cy.get("[data-testid=bar-cover]").should("exist")
      cy.get("[data-testid=axis-legend-attribute-button-top").click()
      cy.get("[role=menuitem]").contains("Remove Side-by-side Layout by Diet").click()
      graph.getDisplayConfigButton().click()
      cy.get("[data-testid=bar-chart-checkbox]").click()
      cy.get("[data-testid=bar-chart-checkbox]").find("input").should("not.be.checked")
      cy.get("[data-testid=bar-cover]").should("not.exist")
      cy.get(".axis-wrapper.left").find("[data-testid=attribute-label]").should("not.exist")
      cy.get("[data-testid=bar-chart-checkbox]").click()
      cy.get(".axis-wrapper.left").find("[data-testid=attribute-label]").should("exist").and("have.text", "Count")
      // TODO: See comment above regarding number of bars.
      // cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 3)
      cy.get("[data-testid=bar-cover]").should("exist")
      cy.dragAttributeToTarget("table", "Sleep", "left")
      cy.get(".axis-wrapper.left").find("[data-testid=attribute-label]").should("exist").and("have.text", "Sleep")
      cy.get("[data-testid=bar-cover]").should("not.exist")
    })
  })
  it("shows a histogram when 'Group into Bins' and 'Fuse Dots into Bars' are both checked", () => {
    cy.dragAttributeToTarget("table", "Height", "bottom")
    cy.get("[data-testid=bar-cover]").should("not.exist")
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=bins-radio-button]").click()
    cy.get("[data-testid=bar-chart-checkbox]").click()
    cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 7)
    cy.get("[data-testid=graph-bin-width-setting]").find("input").clear().type("2").type("{enter}")
    cy.wait(500)
    cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 4)
    cy.wait(500)
    cy.dragAttributeToTarget("table", "Speed", "bottom")
    cy.wait(500)
    cy.get("[data-testid=bar-cover]").should("exist").and("have.length", 6)
    graph.getDisplayConfigButton().click()
    cy.get("[data-testid=bar-chart-checkbox]").click()
    cy.get("[data-testid=bar-cover]").should("not.exist")
  })
})
