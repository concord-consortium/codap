import { MapTileElements as map } from "../support/elements/map-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { CfmElements as cfm } from "../support/elements/cfm"
import { MapLegendHelper as mlh } from "../support/helpers/map-legend-helper"

const filename1 = "cypress/fixtures/RollerCoastersWithLatLong.csv"
const filename2 = "cypress/fixtures/map-data.csv"
const componentName = "Map"
const newComponentName = "My Map"
const arrayOfValues = [
  { attribute: "Category", values: ["N", "Y"], selected: [1, 2] },
  { attribute: "Educ_Tertiary_Perc", values: [], selected: [1, 0, 1] },
  { attribute: "Inversions", values: ["N", "Y"], selected: [1, 2] }
]
const arrayOfAttributes = ["Category", "Educ_Tertiary_Perc", "Inversions"]

context("Map UI", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor&noComponentAnimation`
    cy.visit(url)
    cy.wait(3000)
  })

  it("verify map title", () => {
    cy.log("updates map title")

    cfm.openLocalDoc(filename1)
    c.getIconFromToolShelf("map").click()
    c.getComponentTitle("map").should("have.text", componentName)
    c.changeComponentTitle("map", newComponentName)
    c.getComponentTitle("map").should("have.text", newComponentName)

    cy.log("creates maps with new component name")
    c.getIconFromToolShelf("map").click()

    c.getComponentTitle("map").should("contain", componentName)
    c.getComponentTitle("map", 1).should("contain", componentName)
  })
  it("checks all map tooltips", () => {
    cfm.openLocalDoc(filename1)
    c.getIconFromToolShelf("map").click()
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
  // flaky test skipped in PR #1239, see PT #187534790
  it.skip("checks numerical and categorical attributes for map legend", () => {
    cfm.openLocalDoc(filename2)
    c.getIconFromToolShelf("map").click()
    cy.dragAttributeToTarget("attribute", arrayOfAttributes[0], "map")

    mlh.verifyLegendLabel(arrayOfAttributes[0])
    mlh.verifyCategoricalLegend(arrayOfValues[0].values.length)
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[0])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], arrayOfValues[0].selected[0])
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[1])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], arrayOfValues[0].selected[1])
    mlh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[0])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], arrayOfValues[0].selected[0])
    mlh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[1])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], arrayOfValues[0].selected[1])

    // TODO: unselecting by clicking away in map doesn't work
    // PT bug - #186747322
    // Uncomment the below two lines once it's fixed
    // mlh.unselectLegendCategory()
    // mlh.verifyNoLegendCategorySelectedForCategoricalLegend()

    cy.dragAttributeToTarget("attribute", arrayOfAttributes[1], "map")
    mlh.verifyLegendLabel(arrayOfAttributes[1])
    mlh.verifyNumericLegend()
    mlh.selectNumericLegendCategory(0)
    mlh.verifyNumericLegendKeySelected(arrayOfValues[1].selected[0])
    mlh.selectNumericLegendCategory(2)
    mlh.verifyNumericLegendKeySelected(arrayOfValues[1].selected[2])

    // TODO: unselecting by clicking away in map doesn't work
    // PT bug - #186747322
    // Uncomment the below two lines once it's fixed
    // mlh.unselectLegendCategory()
    // mlh.verifyNoLegendCategorySelectedForNumericLegend()

    mlh.openLegendMenu()
    mlh.removeAttributeFromLegend(arrayOfAttributes[1])
  })
  it("checks show/hide selected/unselected/all map boundaries", () => {
    cfm.openLocalDoc(filename2)
    c.getIconFromToolShelf("map").click()
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
  it("checks show/hide selected/unselected/all map points", () => {
    cfm.openLocalDoc(filename1)
    c.getIconFromToolShelf("map").click()
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
  it("checks heatmap", () => {
    cfm.openLocalDoc(filename1)
    c.getIconFromToolShelf("map").click()
    c.selectTile("map", 0)

    // Can't show heatmap without a legend attribute
    map.getHeatmapCanvas().should("not.exist")
    map.getDisplayConfigButton().click()
    map.getHeatmapBullet().should("not.exist")

    // Turn on heatmap
    mlh.dragAttributeToLegend("Length")
    map.getDisplayConfigButton().click()
    map.getHeatmapBullet().should("exist")
    map.getHeatmapBullet().click()
    map.getHeatmapCanvas().should("exist")

    // Hidden when layer is hidden
    map.getInspectorPalette().contains("RollerCoastersWithLatLong").click()
    map.getHeatmapCanvas().should("not.exist")
    map.getInspectorPalette().contains("RollerCoastersWithLatLong").click()
    map.getHeatmapCanvas().should("exist")

    // Hidden when points are hidden
    map.getDisplayValuesButton().click()
    map.getInspectorPalette().contains("Points").click()
    map.getHeatmapCanvas().should("not.exist")
    map.getInspectorPalette().contains("Points").click()
    map.getHeatmapCanvas().should("exist")

    // Hidden when points are toggled
    map.getDisplayConfigButton().click()
    map.getHeatmapBullet("points").should("exist")
    map.getHeatmapBullet("points").click()
    map.getHeatmapCanvas().should("not.exist")
    map.getHeatmapBullet().click()
    map.getHeatmapCanvas().should("exist")

    // Hidden when legend is removed
    mlh.openLegendMenu()
    mlh.removeAttributeFromLegend("Length")
    map.getHeatmapCanvas().should("not.exist")
  })
  // flaky test skipped in PR #1239, see PT #187534790
  it.skip("checks show/hide map boundaries with legend selections", () => {
    cfm.openLocalDoc(filename2)
    c.getIconFromToolShelf("map").click()
    cy.dragAttributeToTarget("attribute", arrayOfAttributes[0], "map")

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
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], arrayOfValues[0].selected[0])

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
  // flaky test skipped in PR #1239, see PT #187534790
  it.skip("checks show/hide map points with legend selections", () => {
    cfm.openLocalDoc(filename1)
    c.getIconFromToolShelf("map").click()
    cy.wait(1000)
    cy.dragAttributeToTarget("attribute", arrayOfAttributes[2], "map")

    mlh.verifyCategoricalLegend(arrayOfValues[2].values.length)
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[2].values[0])
    map.selectHideShowButton()
    map.getHideSelectedCases().should("not.be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("be.disabled")

    map.selectHideSelectedCases()
    mlh.verifyCategoricalLegend(arrayOfValues[2].values.length-1)

    map.selectHideShowButton()
    map.getHideSelectedCases().should("be.disabled")
    map.getHideUnselectedCases().should("not.be.disabled")
    map.getShowAllCases().should("not.be.disabled")

    map.selectShowAllCases()
    mlh.verifyCategoricalLegend(arrayOfValues[2].values.length)
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[2].values[0], arrayOfValues[2].selected[0])

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
  // flaky test skipped in PR #1239, see PT #187534790
  it.skip("checks legend attribute menu", () => {
    cfm.openLocalDoc(filename2)
    c.getIconFromToolShelf("map").click()
    cy.dragAttributeToTarget("attribute", arrayOfAttributes[0], "map")

    mlh.verifyLegendLabel(arrayOfAttributes[0])
    mlh.openLegendMenu()
    mlh.addAttributeToLegend(arrayOfAttributes[1])
    mlh.verifyLegendLabel(arrayOfAttributes[1])
    mlh.verifyNumericLegend()
    mlh.selectNumericLegendCategory(0)
    mlh.verifyNumericLegendKeySelected(arrayOfValues[1].selected[0])
    mlh.selectNumericLegendCategory(2)
    mlh.verifyNumericLegendKeySelected(arrayOfValues[1].selected[2])

    mlh.openLegendMenu()
    mlh.addAttributeToLegend(arrayOfAttributes[0])
    mlh.verifyLegendLabel(arrayOfAttributes[0])
    mlh.verifyCategoricalLegend(arrayOfValues[0].values.length)
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[0])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], arrayOfValues[0].selected[0])
    mlh.selectCategoryNameForCategoricalLegend(arrayOfValues[0].values[1])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], arrayOfValues[0].selected[1])
    mlh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[0])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[0], arrayOfValues[0].selected[0])
    mlh.selectCategoryColorForCategoricalLegend(arrayOfValues[0].values[1])
    mlh.verifyCategoricalLegendKeySelected(arrayOfValues[0].values[1], arrayOfValues[0].selected[1])
  })

  it("shows connecting lines when Connecting Lines option is checked", () => {
    cfm.openLocalDoc(filename1)
    c.getIconFromToolShelf("map").click()
    c.selectTile("map", 0)
    cy.wait(2000)
    cy.get("[data-testid=connecting-lines-map-1").find("path").should("have.length", 0)
    cy.get("[data-testid=map-display-values-button]").click()
    cy.get("[data-testid=map-values-lines-checkbox]").should("be.visible")
    cy.get("[data-testid=map-values-lines-checkbox]").click()
    cy.wait(2000)
    cy.get("[data-testid=connecting-lines-map-1").find("path").should("have.length", 1)
    cy.get("[data-testid=map-values-lines-checkbox]").click()
    cy.wait(2000)
    cy.get("[data-testid=connecting-lines-map-1").find("path").should("have.length", 0)
  })

})
