export const PointElements = {
  getGraphTile() {
    return cy.get(".codap-graph")
  },
  getPointOnGraph(index: number) {
    return this.getGraphTile().find(".graph-dot-area circle").eq(index)
  },
  selectPointOnGraph(index: number) {
    this.getPointOnGraph(index).click()
  },
  unselectPointOnGraph() {
    this.getGraphTile().find(".graph-dot-area").click()
  },
  hoverOverPointOnGraph(index: number) {
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
  getPointSize(index: number) {
    return this.getPointOnGraph(index).invoke("attr", "r")
  },
  getPointColor(index: number) {
    return this.getPointOnGraph(index).invoke("attr", "style").then($style => {
      return $style?.substring($style.indexOf("fill:") + 1, $style.indexOf(")"))
    })
  },
  getPointStroke(index: number) {
    return this.getPointOnGraph(index).invoke("attr", "style").then($style => {
      return $style?.substring($style.indexOf("stroke:") + 1, $style.indexOf(")"))
    })
  },
  verifyGraphPointDataToolTip(tooltip: string) {
    cy.get("[data-testid=graph-point-data-tip]").should("have.text", tooltip)
  }
}
