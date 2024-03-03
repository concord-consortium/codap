import { ComponentElements as c } from "./component-elements"

export const GraphTileElements = {
  getGraphTile(index = 0) {
    return c.getComponentTile("graph", index)
  },
  getGraphPlot() {
    return this.getGraphTile().find(".graph-plot svg")
  },
  getResizeIcon() {
    return c.getInspectorPanel().find("[data-testid=graph-resize-button]")
  },
  getHideShowButton() {
    return c.getInspectorPanel().find("[data-testid=graph-hide-show-button]")
  },
  getDisplayValuesButton() {
    return c.getInspectorPanel().find("[data-testid=graph-display-values-button]")
  },
  getDisplayConfigButton() {
    return c.getInspectorPanel().find("[data-testid=graph-display-config-button]")
  },
  getDisplayStylesButton() {
    return c.getInspectorPanel().find("[data-testid=graph-display-styles-button]")
  },
  getCameraButton() {
    return c.getInspectorPanel().find("[data-testid=graph-camera-button]")
  },
  getInspectorPalette() {
    return c.getInspectorPanel().find("[data-testid=codap-inspector-palette]")
  }
}
