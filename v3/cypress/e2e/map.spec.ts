import { MapTileElements as map } from "../support/elements/map-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { CfmElements as cfm } from "../support/elements/cfm"
import { LegendHelper as lh } from "../support/helpers/legend-helper"

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
    c.createFromToolshelf("map")
    c.getComponentTitle("map").should("have.text", componentName)
    c.changeComponentTitle("map", newComponentName)
    c.getComponentTitle("map").should("have.text", newComponentName)
    
    cy.log("creates maps with new component name")
    c.createFromToolshelf("map")

    c.getComponentTitle("map").should("contain", componentName)
    c.getComponentTitle("map", 1).should("contain", componentName)
  })
  it("checks all map tooltips", () => {
    cfm.openLocalDoc(filename1)
    c.createFromToolshelf("map")
    c.selectTile("map", 0)

    c.getToolShelfIcon("map").then($element => {
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
  it("checks map points are drawn for new map upon dataset import", () => {
    cfm.openLocalDoc(filename1)
    c.createFromToolshelf("map")

    map.getMapPoints().should("have.length", 157)
  })
  it("checks map points are drawn for existing map upon dataset import", () => {
    c.createFromToolshelf("map")
    cfm.openLocalDoc(filename1)

    map.getMapPoints().should("have.length", 157)
  })
  it("checks map points and boundaries are drawn from multiple datasets", () => {
    cfm.openLocalDoc(filename2)

    map.getMapPoints().should("have.length", 157)
    map.getMapBoundaries().should("have.length", 3)
  })
  it("checks map legend with single dataset", () => {
    cfm.openLocalDoc(filename1)
    c.createFromToolshelf("map")
    c.selectTile("map", 0)

    map.getMapPoints().should("have.length", 157)
    map.getMapBoundaries().should("have.length", 0)
  })
  it("checks numerical and categorical attributes for map legend", () => {
    cfm.openLocalDoc(filename2)

    lh.verifyLegendLabel(arrayOfAttributes[0], "map")
    lh.verifyCategoricalLegend(arrayOfValues[0].values.length, "map")
    lh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[0], "map")
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 89, "map")
    lh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[1], "map")
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], 67, "map")
    lh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[0], "map")
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 89, "map")
    lh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[1], "map")
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], 67, "map")

    lh.unselectLegendCategory("map")
    lh.verifyNoLegendCategorySelectedForCategoricalLegend("map")

    cy.dragAttributeToTarget("table", arrayOfAttributes[1], "map")
    lh.verifyLegendLabel(arrayOfAttributes[1], "map")
    lh.verifyNumericLegend("map")
    lh.selectNumericLegendCategory(0, "map")
    lh.verifyNumericLegendKeySelected(26, "map")
    lh.selectNumericLegendCategory(1, "map")
    lh.verifyNumericLegendKeySelected(29, "map")

    lh.unselectLegendCategory("map")
    lh.verifyNoLegendCategorySelectedForNumericLegend("map")

    lh.openLegendMenu("map")
    lh.removeAttributeFromLegend(arrayOfAttributes[1], "map") 
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
    map.getMapPoints().should("have.length", 0)
    map.getMapBoundaries().should("have.length", 0)

    map.selectHideShowButton()
    map.getHideSelectedCases().should("be.disabled")
    map.getHideUnselectedCases().should("be.disabled")
    map.getShowAllCases().should("not.be.disabled")

    map.selectShowAllCases()
    map.getMapPoints().should("have.length", 157)
    map.getMapBoundaries().should("have.length", 3)

    map.selectMapPoint(0)
    map.selectHideShowButton()
    map.getHideSelectedCases().should("have.text", "Hide Selected Case")
    map.getHideSelectedCases().should("not.be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("be.disabled")

    map.selectHideSelectedCases()
    map.getMapPoints().should("have.length", 156)
    map.getMapBoundaries().should("have.length", 3)
  })
  it("checks show/hide map points with legend selections", () => {
    cfm.openLocalDoc(filename2)

    lh.verifyCategoricalLegend(arrayOfValues[0].values.length, "map")
    lh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[0], "map")
    map.selectHideShowButton()
    map.getHideSelectedCases().should("not.be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("be.disabled")

    map.selectHideSelectedCases()
    lh.verifyCategoricalLegend(arrayOfValues[0].values.length-1, "map")
    map.getMapPoints().should("have.length", 68)
    map.getMapBoundaries().should("have.length", 3)

    map.selectHideShowButton()
    map.getHideSelectedCases().should("be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("not.be.disabled")

    map.selectShowAllCases()
    lh.verifyCategoricalLegend(arrayOfValues[0].values.length, "map")
    map.getMapPoints().should("have.length", 157)
    map.getMapBoundaries().should("have.length", 3)
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 0, "map")

    lh.unselectLegendCategory("map")
    lh.verifyNoLegendCategorySelectedForCategoricalLegend("map")
    map.selectHideShowButton()
    map.getHideSelectedCases().should("be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("be.disabled")

    map.selectHideUnselectedCases()
    lh.verifyCategoricalLegend(arrayOfValues[0].values.length-1, "map") //This should be 0, but it's currently 1. Once fixed, this should be updated.
    map.getMapPoints().should("have.length", 0)
    map.getMapBoundaries().should("have.length", 0)
  })
  it("checks legend attribute menu", () => {
    cfm.openLocalDoc(filename2)

    lh.verifyLegendLabel(arrayOfAttributes[0], "map")
    lh.openLegendMenu("map")
    lh.addAttributeToLegend(arrayOfAttributes[1], "map")
    lh.verifyLegendLabel(arrayOfAttributes[1], "map")
    lh.verifyNumericLegend("map")
    lh.selectNumericLegendCategory(0, "map")
    lh.verifyNumericLegendKeySelected(26, "map")
    lh.selectNumericLegendCategory(1, "map")
    lh.verifyNumericLegendKeySelected(29, "map")

    lh.openLegendMenu("map")
    lh.addAttributeToLegend(arrayOfAttributes[0], "map")
    lh.verifyLegendLabel(arrayOfAttributes[0], "map")
    lh.verifyCategoricalLegend(arrayOfValues[0].values.length, "map")
    lh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[0], "map")
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 89, "map")
    lh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[1], "map")
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], 67, "map")
    lh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[0], "map")
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], 89, "map")
    lh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[1], "map")
    lh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], 67, "map")
  })
})
