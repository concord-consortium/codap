import { MapTileElements as map } from "../support/elements/map-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { CfmElements as cfm } from "../support/elements/cfm"
import { MapLegendHelper as mlh } from "../support/helpers/map-legend-helper"

const filename1 = "cypress/fixtures/RollerCoastersWithLatLong.csv"
const filename2 = "cypress/fixtures/map-points-boundaries.codap3"
const componentName = "Map"
const newComponentName = "My Map"
const arrayOfValues = [
  { attribute: "Inversions", values: ["N", "Y"] },
  { attribute: "Top_Speed", values: [] }
]
const arrayOfAttributes = ["Inversions", "Top_Speed"]

context("Map UI", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor`
    cy.visit(url)
    cy.wait(3000)
  })

  it("verify map title", () => {
    cy.log("updates map title")

    cfm.openLocalDoc(filename1)
    c.getIconFromToolshelf("map").click()
    c.getComponentTitle("map").should("have.text", componentName)
    c.changeComponentTitle("map", newComponentName)
    c.getComponentTitle("map").should("have.text", newComponentName)
    
    cy.log("creates maps with new component name")
    c.getIconFromToolshelf("map").click()

    c.getComponentTitle("map").should("contain", componentName)
    c.getComponentTitle("map", 1).should("contain", componentName)
  })
  it("checks all map tooltips", () => {
    cfm.openLocalDoc(filename1)
    c.getIconFromToolshelf("map").click()
    c.selectTile("map", 0)

    toolbar.getToolShelfIcon("map").then($element => {
      c.checkToolTip($element, c.tooltips.mapToolShelfIcon)
    })
    c.getMinimizeButton("map").then($element => {
      c.checkToolTip($element, c.tooltips.minimizeComponent)
    })
    c.getCloseButton("map").then($element => {
      c.checkToolTip($element, c.tooltips.closeComponent)
    })
    map.getZoomInButton().then($element => {
      c.checkToolTip($element, c.tooltips.mapZoomInButton)
    })
    map.getZoomOutButton().then($element => {
      c.checkToolTip($element, c.tooltips.mapZoomOutButton)
    })
    map.getResizeIcon().then($element => {
      c.checkToolTip($element, c.tooltips.mapResizeButton)
    })
    map.getHideShowButton().then($element => {
      c.checkToolTip($element, c.tooltips.mapHideShowButton)
    })
    map.getDisplayValuesButton().then($element => {
      c.checkToolTip($element, c.tooltips.mapDisplayValuesButton)
    })
    map.getDisplayConfigButton().then($element => {
      c.checkToolTip($element, c.tooltips.mapDisplayConfigButton)
    })
    map.getCameraButton().then($element => {
      c.checkToolTip($element, c.tooltips.mapCameraButton)
    })
  })
  it("checks numerical and categorical attributes for map legend", () => {
    cfm.openLocalDoc(filename2)

    mlh.verifyLegendLabel(arrayOfAttributes[0])
    mlh.verifyCategoricalLegend(arrayOfValues[0].values.length)
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[0])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 89)
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[1])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], 67)
    mlh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[0])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 89)
    mlh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[1])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], 67)

    // TODO: unselecting by clicking away in map doesn't work
    // PT bug - #186747322
    // Uncomment the below two lines once it's fixed
    // mlh.unselectLegendCategory()
    // mlh.verifyNoLegendCategorySelectedForCategoricalLegend()

    // TODO: This drag legend doesn't work for maps
    // PT bug - #186834245
    // Uncomment the next line and remove the two after it
    // cy.dragAttributeToTarget("table", arrayOfAttributes[1], "map")
    mlh.openLegendMenu()
    mlh.addAttributeToLegend("Top_Speed")
    mlh.verifyLegendLabel(arrayOfAttributes[1])
    mlh.verifyNumericLegend()
    mlh.selectNumericLegendCategory(0)
    mlh.verifyNumericLegendKeySelected(26)
    mlh.selectNumericLegendCategory(1)
    mlh.verifyNumericLegendKeySelected(29)

    // TODO: unselecting by clicking away in map doesn't work
    // PT bug - #186747322
    // Uncomment the below two lines once it's fixed
    // mlh.unselectLegendCategory()
    // mlh.verifyNoLegendCategorySelectedForNumericLegend()

    mlh.openLegendMenu()
    mlh.removeAttributeFromLegend(arrayOfAttributes[1]) 
  })
  it("checks show/hide selected/unselected/all map points", () => {
    cfm.openLocalDoc(filename2)
    c.selectTile("map", 0)

    map.selectHideShowButton()
    map.getHideSelectedCases().should("have.text", "Hide Selected Cases")
    map.getHideUnselectedCases().should("have.text", "Hide Unselected Cases")
    map.getShowAllCases().should("have.text", "Show All Cases")
    map.getHideSelectedCases().should("be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("be.disabled")

    map.selectHideUnselectedCases()
    map.selectHideShowButton()
    map.getHideSelectedCases().should("be.disabled")
    map.getHideUnselectedCases().should("be.disabled")
    map.getShowAllCases().should("not.be.disabled")

    map.selectShowAllCases()
    map.selectHideShowButton()
    map.getHideSelectedCases().should("be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("be.disabled")
  })
  it("checks show/hide map points with legend selections", () => {
    cfm.openLocalDoc(filename2)

    mlh.verifyCategoricalLegend(arrayOfValues[0].values.length)
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[0])
    map.selectHideShowButton()
    map.getHideSelectedCases().should("not.be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("be.disabled")

    map.selectHideSelectedCases()
    mlh.verifyCategoricalLegend(arrayOfValues[0].values.length-1)

    map.selectHideShowButton()
    map.getHideSelectedCases().should("be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("not.be.disabled")

    map.selectShowAllCases()
    mlh.verifyCategoricalLegend(arrayOfValues[0].values.length)
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 0)

    // TODO: unselecting by clicking away in map doesn't work
    // PT bug - #186747322
    // Uncomment the below six lines once it's fixed
    // mlh.unselectLegendCategory()
    // mlh.verifyNoLegendCategorySelectedForCategoricalLegend()
    // map.selectHideShowButton()
    // map.getHideSelectedCases().should("be.disabled")
    // map.getHideUnselectedCases().should("not.be.disabled")
    // map.getShowAllCases().should("be.disabled")

    // map.selectHideUnselectedCases()
    // TODO: This should be 0, but it's currently 1. 
    // Once fixed, this should be updated.
    // PT bug - #186916697
    // mlh.verifyCategoricalLegend(1)
  })
  it("checks legend attribute menu", () => {
    cfm.openLocalDoc(filename2)

    mlh.verifyLegendLabel(arrayOfAttributes[0])
    mlh.openLegendMenu()
    mlh.addAttributeToLegend(arrayOfAttributes[1])
    mlh.verifyLegendLabel(arrayOfAttributes[1])
    mlh.verifyNumericLegend()
    mlh.selectNumericLegendCategory(0)
    mlh.verifyNumericLegendKeySelected(26)
    mlh.selectNumericLegendCategory(1)
    mlh.verifyNumericLegendKeySelected(29)

    mlh.openLegendMenu()
    mlh.addAttributeToLegend(arrayOfAttributes[0])
    mlh.verifyLegendLabel(arrayOfAttributes[0])
    mlh.verifyCategoricalLegend(arrayOfValues[0].values.length)
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[0])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 89)
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[1])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], 67)
    mlh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[0])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 89)
    mlh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[1])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], 67)
  })
})
