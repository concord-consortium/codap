import { LegendElements as le } from "../elements/legend-elements"

export const LegendHelper = {
    verifyLegendDoesNotExist() {
        le.getLegend().should("not.exist")
    },
    verifyLegendLabel(name) {
        le.getLegendName().should("have.text", name)
    },
    verifyCategoricalLegend() {
        le.getCategoricalLegendCategories().should("exist")
    },
    verifyNumericLegend() {
        le.getNumericalLegendCategories().should("exist")
    },
    selectCategoryNameForCategoricalLegend(name) {
        le.getCategoricalLegendCategory(name).click()
    },
    selectCategoryColorForCategoricalLegend(name) {
        le.getCategoricalLegendCategory(name).parent().find("rect").click()
    },
    unselectCategoricalLegendCategory() {
        le.getGraphTile().find(".graph-background").eq(0).then($subject => {
            cy.clickToUnselect($subject, { delay: 100 })
        })
    },
    verifyLegendCategorySelected(name) {
        le.getCategoricalLegendCategory(name).parent().find("rect").should("have.class", "legend-rect-selected")
    },
    verifyNoLegendCategorySelectedForCategoricalLegend() {
        le.getCategoricalLegendCategories().each($category => {
            cy.wrap($category).find("rect").should("not.have.class", "legend-rect-selected")
        })
    },
    verifyNoLegendCategorySelectedForNumericLegend() {
        le.getNumericalLegendCategories().then($categories => {
            $categories.forEach($category => {
                cy.wrap($category).should("not.have.class", "legend-rect-selected")
            })
        })
    },
    selectNumericalLegendCategory(index) {
        le.getNumericalLegendCategories().eq(index).click()
    },
    unselectNumericalLegendCategory() {
        le.getGraphTile().find(".graph-dot-area").click()
    },
    verifyLegendQuintileSelected(index) {
        le.getNumericalLegendCategories().eq(index).should("have.class", "legend-rect-selected")
    },
    dragAttributeToPlot(name) {
        cy.dragAttributeToTarget("table", name, "graph_plot")
    },
    dragAttributeToLegend(name) {
        cy.dragAttributeToTarget("table", name, "legend")
    },
    openLegendMenu() {
        le.getLegendAttributeMenu().click()
    },
    addAttributeToLegeend(name) {
        le.getAttributeFromLegendMenu().contains(name).click()
    },
    removeAttributeFromLegend(name) {
        le.getAttributeFromLegendMenu().contains(`Remove Legend: ${name}`).click()
    },
    treatLegendAttributeAsCategorical() {
        le.getAttributeFromLegendMenu().contains("Treat as Categorical").click()
    },
    treatAttributeAsNumeric() {
        le.getAttributeFromLegendMenu().contains("Treat as Numeric").click()
    }
}
