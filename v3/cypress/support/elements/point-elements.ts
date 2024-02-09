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
      return $style.substring($style.indexOf("fill:") + 1, $style.indexOf(")"))
    })
  },
  getPointStroke(index) {
    return this.getPointOnGraph(index).invoke("attr", "style").then($style => {
      return $style.substring($style.indexOf("stroke:") + 1, $style.indexOf(")"))
    })
  },
  verifyGraphPointDataToolTip(tooltip) {
    cy.get("[data-testid=graph-point-data-tip]").should("have.text", tooltip)
  }
}
