import { GraphLegendElements as gle } from "../elements/graph-legend-elements"

export const GraphLegendHelper = {
  verifyLegendDoesNotExist() {
    gle.getLegend().should("not.exist")
  },
  verifyLegendLabel(name: string) {
    gle.getLegendName().should("have.text", name)
  },
  verifyCategoricalLegend(num: number) {
    gle.getCategoricalLegendCategories().should("exist")
    gle.getCategoricalLegendCategories().should("have.length", num)
  },
  verifyNumericLegend() {
    gle.getNumericLegendCategories().should("exist")
  },
  verifyColorLegend(name: string) {
    // Color legends display the attribute's name but nothing else
    this.verifyLegendLabel(name)
    gle.getCategoricalLegendCategories().should("not.exist")
    gle.getNumericLegendCategories().should("not.exist")
  },
  selectCategoryNameForCategoricalLegend(name: string) {
    gle.getCategoricalLegendCategory(name).click()
  },
  /*
   * Clicks a key with a modifier held. Legend categories are nominal, so shift, cmd, and ctrl all
   * mean the same thing -- toggle this category -- and each needs its own coverage. cmd and ctrl
   * are platform-exclusive, so only the one matching the running platform toggles; see
   * hasSelectionModifier in platform-utils.
   */
  modifierClickCategoryForCategoricalLegend(name: string, modifier: "shiftKey" | "metaKey" | "ctrlKey") {
    gle.getCategoricalLegendCategory(name).click({ [modifier]: true })
  },
  selectCategoryColorForCategoricalLegend(name: string) {
    gle.getCategoricalLegendCategory(name).parent().find(".legend-key-shape").click()
  },
  /*
   * Clicks the top-right corner of the key's box, which no shape's ink reaches -- it is 9px from the
   * center of a circle drawn at radius 7.5. The click goes through the page rather than through the
   * target element, so it is the browser's own hit testing that has to land on the target; clicking
   * the element directly would pass whether or not a user could reach that corner.
   *
   * The left corners are no good for this: the tile's resize border overlays them.
   */
  selectCategoryKeyCornerForCategoricalLegend(name: string) {
    gle.getCategoricalLegendCategory(name).parent().find(".legend-key-target").then($target => {
      const box = $target[0].getBoundingClientRect()
      const x = box.right - 1
      const y = box.top + 1
      cy.document().then(doc => {
        expect(doc.elementFromPoint(x, y), "element under the key's empty corner")
          .to.have.class("legend-key-target")
      })
      cy.get("body").click(x, y)
    })
  },
  unselectLegendCategory() {
        gle.getGraphTile().find(".plot-cell-background").eq(0).click({force:true})
  },
  // A circle is the only key drawn as arcs, so the arc command tells the two apart without pinning
  // down the exact path data.
  verifyCategoricalLegendKeyIsCircle(name: string, isCircle: boolean) {
    gle.getCategoricalLegendCategory(name).parent().find(".legend-key-shape")
      .should($path => {
        const d = $path.attr("d") ?? ""
        expect(/[Aa]/.test(d), `key for ${name} drawn as arcs`).to.equal(isCircle)
      })
  },
  verifyCategoricalLegendKeySelected(name: string) {
    gle.getCategoricalLegendCategory(name).parent().find(".legend-key-shape")
      .should("have.class", "legend-rect-selected")
  },
  verifyCategoricalLegendKeyNotSelected(name: string) {
    gle.getCategoricalLegendCategory(name).parent().find(".legend-key-shape")
      .should("not.have.class", "legend-rect-selected")
  },
  verifyNumericLegendKeySelected() {
    gle.getNumericLegendCategories().should("have.class", "legend-rect-selected")
  },
  verifyNoLegendCategorySelectedForCategoricalLegend() {
    gle.getCategoricalLegendCategories().each($category => {
      cy.wrap($category).find(".legend-key-shape").should("not.have.class", "legend-rect-selected")
    })
  },
  verifyNoLegendCategorySelectedForNumericLegend() {
    gle.getNumericLegendCategories().each($category => {
      cy.wrap($category).should("not.have.class", "legend-rect-selected")
    })
  },
  selectNumericLegendCategory(index: number) {
    gle.getNumericLegendCategories().eq(index).click()
  },
  verifyLegendQuintileSelected(index: number) {
    gle.getNumericLegendCategories().eq(index).should("have.class", "legend-rect-selected")
  },
  dragAttributeToPlot(name: string) {
    cy.dragAttributeToTarget("table", name, "graph-plot")
  },
  dragAttributeToLegend(name: string) {
    cy.dragAttributeToTarget("table", name, "graph-legend")
  },
  openLegendMenu() {
    gle.getLegendAttributeMenu().click()
  },
  addAttributeToLegend(name: string) {
    gle.getAttributeFromLegendMenu().contains(name).click()
  },
  removeAttributeFromLegend(name: string) {
    gle.getAttributeFromLegendMenu().contains(`Remove Legend: ${name}`).click()
  },
  treatLegendAttributeAsCategorical() {
    gle.getAttributeFromLegendMenu().contains("Treat as Categorical").click()
  },
  treatAttributeAsNumeric() {
    gle.getAttributeFromLegendMenu().contains("Treat as Numeric").click()
  }
}
