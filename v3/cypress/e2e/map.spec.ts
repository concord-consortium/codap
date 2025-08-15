import { LatLngBounds, Map as LeafletMap } from "leaflet"
import { MapTileElements as map } from "../support/elements/map-tile"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { CfmElements as cfm } from "../support/elements/cfm"
import { MapLegendHelper as mlh } from "../support/helpers/map-legend-helper"
import { TableTileElements as table } from "../support/elements/table-tile"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"
import { MapCanvasHelper as mch } from "../support/helpers/map-canvas-helper"

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
    const url = `${Cypress.config("index")}?mouseSensor&noComponentAnimation&noEntryModal&suppressUnsavedWarning`
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
  it("checks map pins", () => {
    c.getIconFromToolShelf("table").click()
    toolbar.getNewCaseTable().click()
    c.getResizeControl("table")
      .realMouseDown({ position: "center" })
      .realMouseMove(350, 0)
      .realMouseUp()
    table.addNewAttribute(1, "pinLat")
    table.addNewAttribute(1, "pinLong")
    // TODO: Test colors. I wasn't able to figure out how to set the type to color.
    // table.addNewAttribute(1, "pinColor")
    // table.editAttributeProperties("pinColor", "", null, "color")

    c.getIconFromToolShelf("map").click()
    map.getMapTile().should("exist")
    map.getPinLayer().should("exist")
    map.getAddPinButton().should("exist")
    map.getRemovePinButton().should("exist").should("be.disabled")

    // Can add a pin
    table.getNumOfRows().should("eq", "2") // Headers + input row
    map.getAddPinButton().click()
    map.getAddPinButton().should("have.class", "active")
    // Note: Leaflet decides Cypress click() is a double click so it zooms the map
    // at the location of the click. At least sometimes this double click happens before
    // the actual click, so the map is zoomed and then the pin is added to the zoomed map.
    // The location of the click is set so we can verify the pin longitude is normalized.
    map.getPinLayer().click(50, 210)
    map.getAddPinButton().should("not.have.class", "active")
    map.getMapPin().should("exist")
    table.getNumOfRows().should("eq", "3")
    table.getCell(4, 2).invoke("text").then(text => {
      // Unicode minus
      const normalized = text.replace(/\u2212/g, "-")
      expect(parseFloat(normalized)).to.be.within(-180, 180)
    })

    // Can select a pin
    table.getSelectedRows().should("have.length", 0)
    map.getMapPin().should("not.have.class", "selected-pin")
    map.getAddPinButton().should("be.enabled")
    map.getMapPin().click()
    map.getMapPin().should("have.class", "selected-pin")
    table.getSelectedRows().should("have.length", 1)
    map.getAddPinButton().should("be.disabled")

    // Can deselect a pin by shift+clicking
    map.getMapPin().click({ shiftKey: true })
    map.getMapPin().should("not.have.class", "selected-pin")
    table.getSelectedRows().should("have.length", 0)

    // Pin is selected when the table row is selected
    table.getCell(2, 2).click()
    map.getMapPin().should("have.class", "selected-pin")
    table.getSelectedRows().should("have.length", 1)

    // Can deselect a pin by clicking on the map
    map.getPinLayer().click()
    map.getMapPin().should("not.have.class", "selected-pin")
    table.getSelectedRows().should("have.length", 0)
    map.getMapPin().click()
    map.getMapPin().should("have.class", "selected-pin")
    table.getSelectedRows().should("have.length", 1)

    // Can hide pins using the ruler menu
    map.getDisplayValuesButton().click()
    map.getInspectorPalette().contains("Pins").click()
    map.getMapPins().should("not.exist")
    map.getInspectorPalette().contains("Pins").click()
    map.getMapPin().should("exist")

    // Can hide pins using the layers menu
    map.getDisplayConfigButton().click()
    map.getInspectorPalette().contains("New Dataset").click()
    map.getMapPins().should("not.exist")
    map.getInspectorPalette().contains("New Dataset").click()
    map.getMapPin().should("exist")

    // Can remove a pin using the remove pin button
    c.getComponentTitleBar("map").click()
    map.getRemovePinButton().should("not.be.disabled")
    map.getRemovePinButton().click()
    map.getRemovePinButton().should("be.disabled")
    map.getMapPins().should("not.exist")
    table.getNumOfRows().should("eq", "2") // Headers + input row
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

const apiTesterUrl='https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en'
const openAPITester = () => {
  c.clickIconFromToolShelf("web page")
  webView.enterUrl(apiTesterUrl)
  cy.wait(1000)
}

context("Map API", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?suppressUnsavedWarning#file=examples:Four%20Seals`
    cy.visit(url)
  })
  it("supports a background georaster", () => {
    openAPITester()

    // Make sure the API tester is loaded
    webView.getTitle().should("contain.text", "CODAP API Tester")

    // Check that the geo raster layer is not there
    map.getMapGeoRasterLayer().should("not.exist")

    cy.log("Handle initial setting of the geoRaster")
    const cmd1 = `{
      "action": "update",
      "resource": "component[Measurements]",
      "values": {
        "geoRaster": {
          "type": "png",
          "url": "https://models-resources.concord.org/neo-images/v1/GPM_3IMERGM/720x360/2007-09-01.png"
        }
      }
    }`
    webView.sendAPITesterCommand(cmd1)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
    webView.clearAPITesterResponses()

    map.getMapGeoRasterLayer().should("exist")

    cy.log("Handle updating the geoRaster")
    const cmd2 = `{
      "action": "update",
      "resource": "component[Measurements]",
      "values": {
        "geoRaster": {
          "type": "png",
          "url": "https://models-resources.concord.org/neo-images/v1/GPM_3IMERGM/720x360/2007-10-01.png"
        }
      }
    }`
    webView.sendAPITesterCommand(cmd2)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
    webView.clearAPITesterResponses()

    // TODO: we should check that the image updated somehow, I think this would require reading a pixel
    // of the canvas and checking that it changed.
    map.getMapGeoRasterLayer().should("exist")

    cy.log("Remove the geoRaster")
    const cmd3 = `{
      "action": "update",
      "resource": "component[Measurements]",
      "values": {
        "geoRaster": null
      }
    }`
    webView.sendAPITesterCommand(cmd3)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)
    webView.clearAPITesterResponses()

    map.getMapGeoRasterLayer().should("not.exist")
  })
})

context("Map Resizing", () => {

  function checkBoundsOfMap(boundsChecker: (bounds: LatLngBounds) => void) {
    cy.log("Fit map bounds to the data")
    mch.getMapTileId().then((tileId) => {
      cy.log(`Map Tile ID: ${tileId}`)
      return cy.window().then((win: any) => {
        const leafletMap = win.leafletMaps[tileId] as LeafletMap

        if (!leafletMap) {
          throw new Error(`Leaflet map for Tile ID ${tileId} is undefined or empty.`)
        }

        return leafletMap
      })
    })
    .then((leafletMap: LeafletMap) => {
      cy.wrap(leafletMap).should((map) => {
        const bounds = map.getBounds()
        expect(bounds).to.not.be.empty
        boundsChecker(bounds)
      })
    })
  }

  function checkFitOfData() {
    checkBoundsOfMap((bounds) => {
      // `within` is used so the fit is a tight fit.
      // Ie. we don't want it to pass if the whole world is shown,
      // and we don't want it to pass if all of the points are not shown.
      expect(bounds.getNorth()).to.be.within(47, 53)
      expect(bounds.getEast()).to.be.within(-70, -66)
      expect(bounds.getSouth()).to.be.within(23, 28)
      expect(bounds.getWest()).to.be.within(-126, -123)
    })
  }

  function openCODAPWithDataset(url: string) {
    cy.visit(url)
    cy.wait(3000)
    cfm.openLocalDoc(filename1)
  }

  // TODO:
  // - test that the map bounds are preserved after a load (ideally we'd pan the map save it and reload the page)
  // but it might be sufficient to just have a prepared document with a map with different bounds.
  // - test that the user's current position is used

  it("fits map bounds to the data without animation", () => {
    const url = `${Cypress.config("index")}?mouseSensor&noComponentAnimation&noEntryModal&suppressUnsavedWarning`
    openCODAPWithDataset(url)
    c.getIconFromToolShelf("map").click()
    checkFitOfData()
  })

  // This is skipped because the test can fail due to an issue documented in use-map-model.ts
  // The size of the leaflet dom element can fall behind the size of the tile when the tiles
  // are animating on slow computers.
  it("fits map bounds to the data with animation", () => {
    const url = `${Cypress.config("index")}?mouseSensor&noEntryModal&suppressUnsavedWarning`
    openCODAPWithDataset(url)
    c.getIconFromToolShelf("map").click()
    checkFitOfData()
  })

  it("fits map bounds to the data when created by the API", () => {
    const url = `${Cypress.config("index")}?mouseSensor&noEntryModal&suppressUnsavedWarning`
    openCODAPWithDataset(url)
    openAPITester()

    // Make sure the API tester is loaded
    webView.getTitle().should("contain.text", "CODAP API Tester")

    const cmd1 = `{
      "action": "create",
      "resource": "component",
      "values": {
        "type": "map",
        "name": "name-map",
        "title": "title-map"
      }
    }`
    webView.sendAPITesterCommand(cmd1)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)

    checkFitOfData()
  })

  it("fits map bounds to the data when created by the API", () => {
    const url = `${Cypress.config("index")}?mouseSensor&noEntryModal&suppressUnsavedWarning`
    openCODAPWithDataset(url)
    openAPITester()

    // Make sure the API tester is loaded
    webView.getTitle().should("contain.text", "CODAP API Tester")

    const cmd1 = `{
      "action": "create",
      "resource": "component",
      "values": {
        "type": "map",
        "name": "name-map",
        "title": "title-map",
        "legendAttributeName": "Drop",
        "dataContext": "RollerCoastersWithLatLong"
      }
    }`
    webView.sendAPITesterCommand(cmd1)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)

    checkFitOfData()
  })

  it("map zoom and center are used when specified by the API", () => {
    const url = `${Cypress.config("index")}?mouseSensor&noEntryModal&suppressUnsavedWarning`
    openCODAPWithDataset(url)
    openAPITester()

    // Make sure the API tester is loaded
    webView.getTitle().should("contain.text", "CODAP API Tester")

    const cmd1 = `{
      "action": "create",
      "resource": "component",
      "values": {
        "type": "map",
        "name": "name-map",
        "title": "title-map",
        "center": [0, 20],
        "zoom": 4
      }
    }`
    webView.sendAPITesterCommand(cmd1)
    webView.confirmAPITesterResponseContains(/"success":\s*true/)

    checkBoundsOfMap((bounds) => {
      expect(bounds.getNorth()).to.be.within(12, 16)
      expect(bounds.getEast()).to.be.within(41, 45)
      expect(bounds.getSouth()).to.be.within(-16, 12)
      expect(bounds.getWest()).to.be.within(-5, -1)
    })
  })
})
