export const AxisElements = {
  getGraphTile() {
    return cy.get(".codap-graph")
  },
  getAxisElement(axis: string) {
    switch (axis) {
      case "bottom":
      case "left":
      default:
        return this.getGraphTile().find(`[data-testid=axis-${axis}]`).parent()
      case "legend":
        return this.getGraphTile().find("[data-testid=axis-legend-attribute-button-legend]")
    }
  },
  getDroppableAxis(axis: string) {
    return this.getGraphTile().find(`[data-testid^=add-attribute-drop-${axis}]`)
  },
  getAxisLabel(axis: string) {
    return this.getAxisElement(axis).find("[data-testid=attribute-label]")
  },
  getDefaultAxisLabel(axis: string) {
    return this.getAxisElement(axis).find("[data-testid=empty-label]")
  },
  getTickMarks(axis: string, categorical = false) {
    if (categorical) {
      return this.getAxisElement(axis).find("[data-testid=tick]")
    } else if (axis === "left" || axis === "right") {
      // y-axes: tick marks are <g class="tick">
      return this.getAxisElement(axis).find("g.tick")
    } else {
      // x-axis: tick marks are <line class="tick">
      return this.getAxisElement(axis).find("line.tick")
    }
  },
  getTickMark(axis: string, index: number, categorical = false) {
    return this.getTickMarks(axis, categorical).eq(index)
  },
  getTickLength(axis: string, attr: string, categorical = false) {
    if (axis === "left" || axis === "right") {
      // For y-axes, tick marks are <g class="tick"><line ...></line></g>
      return this.getTickMark(axis, 0, categorical).find("line").invoke("attr", attr).then(tickLength => {
        return parseFloat(tickLength ?? '0')
      })
    } else {
      // For x-axes, tick marks are <line class="tick">
      return this.getTickMark(axis, 0, categorical).invoke("attr", attr).then(tickLength => {
        return parseFloat(tickLength ?? '0')
      })
    }
  },
  getGridLineLength(axis: string, attr: string, categorical = false) {
    return this.getGridLine(axis, 0, categorical).invoke("attr", attr).then(lineLength => {
      return parseInt(`${lineLength}`, 10)
    })
  },
  getGridLines(axis: string, categorical = false) {
    switch (categorical) {
      case true:
        return this.getAxisElement(axis).find("[data-testid=category-on-axis] [data-testid=divider]")
      case false:
        return this.getAxisElement(axis).find(".tick line")
    }
  },
  getGridLine(axis: string, index: number, categorical = false) {
    return this.getGridLines(axis, categorical).eq(index)
  },
  getAxisTickLabels(axis: string, categorical = false) {
    if (categorical) {
      return this.getAxisElement(axis).find("[data-testid=category-on-axis] [data-testid=category-label]")
    } else if (axis === "left" || axis === "right") {
      // y-axis: tick labels are <g class="tick"><text>...</text></g>
      return this.getAxisElement(axis).find("g.tick > text")
    } else {
      // x-axis (date): tick labels are <text> without a class
      return this.getAxisElement(axis).find("text:not([class])")
    }
  },
  getAxisTickLabel(axis: string, index: number, categorical = false) {
    return this.getAxisTickLabels(axis, categorical).eq(index)
  },
  isAxisTickLabelOrientationTransformed(axis: string, index: number, categorical = false) {
    return this.getAxisTickLabels(axis, categorical).eq(index).invoke("attr", "transform").should("exist")
  },
  dragAttributeToAxis(name: string, axis: string) {
    cy.dragAttributeToTarget("graph", name, axis)
  },
  getAxisAttributeMenu(axis: string) {
    return this.getGraphTile().find(`[data-testid=attribute-label-menu-${axis}]`)
  },
  getAxisAttributeMenuButton(axis: string) {
    return this.getGraphTile().find(`[data-testid=axis-legend-attribute-button-${axis}]`)
  },
  getAttributeFromAttributeMenu(axis: string) {
    return this.getAxisAttributeMenu(axis).parent()
  }
}
