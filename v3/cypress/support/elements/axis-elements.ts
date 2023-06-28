export const AxisElements = {
  getGraphTile() {
    return cy.get(".codap-graph")
  },
  getAxisElement(axis) {
    switch (axis) {
      case "X":
      case "x":
      default:
        return this.getGraphTile().find("[data-testid=axis-bottom]").parent()
      case "Y":
      case "y":
        return this.getGraphTile().find("[data-testid=axis-left]").parent()
      case "legend":
        return this.getGraphTile().find(".axis-legend-attribute-menu.legend .chakra-menu__menu-button")
    }
  },
  getAxisLabel(axis) {
    return this.getAxisElement(axis).find(".attribute-label")
  },
  getDefaultAxisLabel(axis) {
    return this.getAxisElement(axis).find(".empty-label")
  },
  getTickMarks(axis) {
    return this.getAxisElement(axis).find("line.tick")
  },
  getTickMark(axis, index) {
    return this.getAxisElement(axis).find("line.tick").eq(index)
  },
  getTickLength(axis, attr) {
    return this.getTickMark(axis, 0).invoke("attr", attr).then(tickLength => {
      return parseInt(tickLength, 10)
    })
  },
  getGridLines(axis) {
    return this.getAxisElement(axis).find("line.tick")
  },
  getGridLine(axis, index) {
    return this.getAxisElement(axis).find("line.tick").eq(index)
  },
  getAxisTickLabels(axis) {
    return this.getAxisElement(axis).find("text.category-label")
  },
  getAxisTickLabel(axis, index) {
    return this.getAxisElement(axis).find("text.category-label").eq(index)
  },
  isAxisTickLabelOrientationTransformed(axis, index) {
    return this.getAxisElement(axis).find("text.category-label").eq(index).invoke("attr", "transform").should("exist")
  },
  dragAttributeToAxis(name, axis) {
    cy.dragAttributeToTarget("graph", name, axis)
  },
  getAxisAttributeMenu(axis) {
    switch (axis) {
      case "X":
      case "x":
      default:
        return this.getGraphTile().find(".axis-legend-attribute-menu.bottom .chakra-menu__menu-button")
      case "Y":
      case "y":
        return this.getGraphTile().find(".axis-legend-attribute-menu.left .chakra-menu__menu-button")
      case "legend":
        return this.getGraphTile().find(".axis-legend-attribute-menu.legend .chakra-menu__menu-button")
    }
  },
  getAttributeFromAttributeMenu(axis) {
    return this.getAxisAttributeMenu(axis).parent()
  }
}
