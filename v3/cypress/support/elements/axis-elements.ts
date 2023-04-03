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
                return this.getGraphTile().find(".axis-legend-attribute-menu.legend>button")
        }
    },
    getAxisLabel(axis) {
        return this.getAxisElement(axis).find(".axis-title")
    },
    getTickMarks(axis) {
        return this.getAxisElement(axis).find(".tick line")
    },
    getTickMark(axis, index) {
        return this.getAxisElement(axis).find(".tick line").eq(index)
    },
    getTickLength(axis, attr) {
        return this.getTickMark(axis, 0).invoke("attr", attr).then(tickLength => {
            return parseInt(tickLength, 10)
        })
    },
    getGridLines(axis) {
        return this.getAxisElement(axis).find(".tick line")
    },
    getGridLine(axis, index) {
        return this.getAxisElement(axis).find(".tick line").eq(index)
    },
    getAxisTickLabels(axis) {
        return this.getAxisElement(axis).find(".tick text")
    },
    getAxisTickLabel(axis, index) {
        return this.getAxisElement(axis).find(".tick text").eq(index)
    },
    isAxisTickLabelOrientationTransformed(axis, index) {
        return this.getAxisElement(axis).find(".tick text").eq(index).invoke("attr", "transform").should("exist")
    },
    dragAttributeToAxis(name, axis) {
        cy.dragAttributeToTarget("graph", name, axis)
    },
    getAxisAttributeMenu(axis) {
        switch (axis) {
            case "X":
            case "x":
            default:
                return this.getGraphTile().find(".axis-legend-attribute-menu.bottom>button")
            case "Y":
            case "y":
                return this.getGraphTile().find(".axis-legend-attribute-menu.left>button")
            case "legend":
                return this.getGraphTile().find(".axis-legend-attribute-menu.legend>button")
        }
    },
    getAttributeFromAttributeMenu(axis) {
        return this.getAxisAttributeMenu(axis).parent()
    }
}
