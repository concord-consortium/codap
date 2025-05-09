import { ComponentElements as c } from "./component-elements"

export const MapTileElements = {
  getMapTile(index = 0) {
    return c.getComponentTile("map", index)
  },
  getResizeIcon() {
    return c.getInspectorPanel().find("[data-testid=map-resize-button]")
  },
  getHideShowButton() {
    return c.getInspectorPanel().find("[data-testid=map-hide-show-button]")
  },
  selectHideShowButton() {
    c.getInspectorPanel().find("[data-testid=map-hide-show-button]").click()
    c.getInspectorPanel().find("[data-testid=hide-show-menu-list]").should("be.visible")
  },
  getDisplayValuesButton() {
    return c.getInspectorPanel().find("[data-testid=map-display-values-button]")
  },
  getDisplayConfigButton() {
    return c.getInspectorPanel().find("[data-testid=map-display-config-button]")
  },
  getCameraButton() {
    return c.getInspectorPanel().find("[data-testid=map-camera-button]")
  },
  getInspectorPalette() {
    return c.getInspectorPanel().find("[data-testid=codap-inspector-palette]")
  },
  getHeatmapBullet(type: "heatmap" | "points" = "heatmap") {
    return this.getInspectorPalette().contains(`Display as ${type}`)
  },
  getZoomInButton() {
    return this.getMapTile().find(".leaflet-control-zoom-in")
  },
  getZoomOutButton() {
    return this.getMapTile().find(".leaflet-control-zoom-out")
  },
  getAddPinButton() {
    return this.getMapTile().find("[data-testid=add-pin-button]")
  },
  getRemovePinButton() {
    return this.getMapTile().find("[data-testid=remove-pin-button]")
  },
  getPinLayer() {
    return this.getMapTile().find(".map-pin-layer")
  },
  getMapPins() {
    return this.getPinLayer().find(".map-pin")
  },
  getMapPin(index=0) {
    return this.getMapPins().eq(index)
  },
  getMapGeoRasterLayer() {
    return this.getMapTile().find(".leaflet-overlay-pane .leaflet-layer")
  },
  getHideSelectedCases() {
    return c.getInspectorPanel().find("[data-testid=hide-selected-cases]")
  },
  selectHideSelectedCases() {
    c.getInspectorPanel().find("[data-testid=hide-show-menu-list]").should("be.visible").then(() => {
      c.getInspectorPanel().find("[data-testid=hide-selected-cases]").click()
      c.getInspectorPanel().find("[data-testid=hide-selected-cases]").should("not.exist")
      c.getInspectorPanel().find("[data-testid=hide-show-menu-list]").should("not.be.visible")
    })
  },
  getHideUnselectedCases() {
    return c.getInspectorPanel().find("[data-testid=hide-unselected-cases]")
  },
  getHeatmapCanvas() {
    return this.getMapTile().find(".heatmap-canvas")
  },
  selectHideUnselectedCases() {
    c.getInspectorPanel().find("[data-testid=hide-show-menu-list]").should("be.visible").then(() => {
      c.getInspectorPanel().find("[data-testid=hide-unselected-cases]").click()
      c.getInspectorPanel().find("[data-testid=hide-unselected-cases]").should("not.exist")
      c.getInspectorPanel().find("[data-testid=hide-show-menu-list]").should("not.be.visible")
    })
  },
  getShowAllCases() {
    return c.getInspectorPanel().find("[data-testid=show-all-cases]")
  },
  selectShowAllCases() {
    c.getInspectorPanel().find("[data-testid=hide-show-menu-list]").should("be.visible").then(() => {
      c.getInspectorPanel().find("[data-testid=show-all-cases]").click()
      c.getInspectorPanel().find("[data-testid=show-all-cases]").should("not.exist")
      c.getInspectorPanel().find("[data-testid=hide-show-menu-list]").should("not.be.visible")
    })
  }
}
