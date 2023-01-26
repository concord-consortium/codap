export const PointElements = {
    getGraphTile() {
        return cy.get(".codap-graph")
    },
    getPointOnGraph(index) {
        return this.getGraphTile().find(".graph-dot-area circle").eq(index)
    },
    selectPointOnGraph(index) {
        this.getPointOnGraph(index).click()
    },
    unselectPointOnGraph() {
        this.getGraphTile().find(".graph-dot-area").click()
    },
    hoverOverPointOnGraph(index) {
        this.getPointOnGraph(index).trigger('mouseover')
    },
    getPointDataTip() {
        return cy.get("[data-testid=graph-point-data-tip")
    },
    // selectPointsOnGraph() {
        
    // },
    unselectPointsOnGraph() {
        this.getGraphTile().find(".graph-dot-area").click()
    },
    // selectAllPointsOnGraph() {
        
    // },
    unselectAllPointsOnGraph() {
        this.getGraphTile().find(".graph-dot-area").click()
    },
    getPointSize(index) {
        return this.getPointOnGraph(index).invoke("attr", "r")
    },
    getPointColor(index) {
        return this.getPointOnGraph(index).invoke("attr", "style").then($style => {
            return $style.substring($style.indexOf("fill:")+1, $style.indexOf(")"))
        })
    },
    getPointStroke(index) {
        return this.getPointOnGraph(index).invoke("attr", "style").then($style => {
            return $style.substring($style.indexOf("stroke:")+1, $style.indexOf(")"))
        })
    },
    verifyPointIsSelected(index) {
        this.getPointOnGraph(index).invoke("attr", "class").should("contain", "graph-dot-highlighted")
        this.getPointColor(index).should("contain", "rgb(70, 130, 180)")
    },
    verifyPointIsSelectedFromLegend(index) {
        this.getPointOnGraph(index).invoke("attr", "class").should("contain", "graph-dot-highlighted")
        this.getPointStroke(index).should("contain", "rgb(255, 0, 0)")
    },
    verifyHighlightedPoint(tooltip) {
        this.getGraphTile().find(".graph-dot-area .graph-dot.graph-dot-highlighted").click()
        cy.get("[data-testid=graph-point-data-tip]").should("have.text", tooltip)
    },
    verifyGraphPointDataToolTip(tooltip) {
        cy.get("[data-testid=graph-point-data-tip]").should("have.text", tooltip)
    }
}
