import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { CfmElements as cfm } from "../support/elements/cfm"
import graphRules from '../fixtures/graph-rules.json'

const collectionName = "Mammals"
const newCollectionName = "Animals"
const plots = graphRules.plots

context("Test graph plot transitions", () => {
  beforeEach(function () {
    const queryParams = "?mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cfm.openLocalDoc("cypress/fixtures/3TableGroups.codap")
    cy.wait(2500)
  })

  // Skipping this test because Cypress 13 does not support displaying pixijs canvas elements in CI
  // https://github.com/cypress-io/cypress/issues/28289
  // This test can be unskipped when the above cypress bug is resolved
  // (In local, this works fine and the tests can be run successfully)
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

  it("updates graph title", () => {
    c.getComponentTitle("graph").should("have.text", collectionName)
    c.changeComponentTitle("graph", newCollectionName)
    c.getComponentTitle("graph").should("have.text", newCollectionName)
  })
  it("creates graphs with new collection name", () => {
    c.getIconFromToolshelf("graph").click()

    c.getComponentTitle("graph").should("contain", collectionName)
    c.getComponentTitle("graph", 1).should("contain", collectionName)

    c.getIconFromToolshelf("graph").click()
    c.getComponentTitle("graph", 2).should("contain", collectionName)
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
