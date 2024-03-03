export const AxisElements = {
  getGraphTile() {
    return cy.get(".codap-graph")
  },
  getAxisElement(axis) {
    switch (axis) {
      case "bottom":
      case "left":
      default:
        return this.getGraphTile().find(`[data-testid=axis-${axis}]`).parent()
      case "legend":
        return this.getGraphTile().find("[data-testid=axis-legend-attribute-button-legend]")
    }
  },
  getDroppableAxis(axis) {
    return this.getGraphTile().find(`[data-testid^=add-attribute-drop-${axis}]`)
  },
  getAxisLabel(axis) {
    return this.getAxisElement(axis).find("[data-testid=attribute-label]")
  },
  getDefaultAxisLabel(axis) {
    return this.getAxisElement(axis).find("[data-testid=empty-label]")
  },
  getTickMarks(axis, categorical = false) {
    switch (categorical) {
      case true:
        return this.getAxisElement(axis).find("[data-testid=tick]")
      case false:
        return this.getAxisElement(axis).find(".tick line")
    }
  },
  getTickMark(axis, index, categorical = false) {
    return this.getTickMarks(axis, categorical).eq(index)
  },
  getTickLength(axis, attr, categorical = false) {
    return this.getTickMark(axis, 0, categorical).invoke("attr", attr).then(tickLength => {
      return parseInt(tickLength, 10)
    })
  },
  getGridLineLength(axis, attr, categorical = false) {
    return this.getGridLine(axis, 0, categorical).invoke("attr", attr).then(lineLength => {
      return parseInt(lineLength, 10)
    })
  },
  getGridLines(axis, categorical = false) {
    switch (categorical) {
      case true:
        return this.getAxisElement(axis).find("[data-testid=category-on-axis] [data-testid=divider]")
      case false:
        return this.getAxisElement(axis).find(".tick line")
    }
  },
  getGridLine(axis, index, categorical = false) {
    return this.getGridLines(axis, categorical).eq(index)
  },
  getAxisTickLabels(axis, categorical = false) {
    switch (categorical) {
      case true:
        return this.getAxisElement(axis).find("[data-testid=category-on-axis] [data-testid=category-label]")
      case false:
        return this.getAxisElement(axis).find(".tick text")
    }
  },
  getAxisTickLabel(axis, index, categorical = false) {
    return this.getAxisTickLabels(axis, categorical).eq(index)
  },
  isAxisTickLabelOrientationTransformed(axis, index, categorical = false) {
    return this.getAxisTickLabels(axis, categorical).eq(index).invoke("attr", "transform").should("exist")
  },
  dragAttributeToAxis(name, axis) {
    cy.dragAttributeToTarget("graph", name, axis)
  },
  getAxisAttributeMenu(axis) {
    return this.getGraphTile().find(`[data-testid=attribute-label-menu-${axis}]`)
  },
  getAxisAttributeMenuButton(axis) {
    return this.getGraphTile().find(`[data-testid=axis-legend-attribute-button-${axis}]`)
  },
  getAttributeFromAttributeMenu(axis) {
    return this.getAxisAttributeMenu(axis).parent()
  }
}
