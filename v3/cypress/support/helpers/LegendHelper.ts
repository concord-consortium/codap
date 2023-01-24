import { LegendElements as le } from "../elements/LegendElements"

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
    // verifyTickMarksDoNotExist(axis) {
    //     cy.log(`Check no tick marks for axis ${axis}`)
    //     a.getTickMarks(axis).should("not.exist")
    // },
    // verifyGridLinesDoNotExist(axis) {
    //     cy.log(`Check no grid lines for axis ${axis}`)
    //     a.getTickMarks(axis).should("not.exist")
    // },
    // verifyXAxisTickMarksNotDisplayed() {
    //     cy.log(`Check tick marks not displayed for x axis`)
    //     a.getTickLength("x", "y2").then($length => {
    //         expect($length).to.be.lessThan(0)
    //     })
    // },
    // verifyXAxisTickMarksDisplayed() {
    //     cy.log(`Check tick marks displayed for x axis`)
    //     a.getTickLength("x", "y2").then($length => {
    //         expect($length).to.be.greaterThan(0)
    //     })
    // },
    // verifyYAxisTickMarksNotDisplayed() {
    //     cy.log(`Check tick marks not displayed for y axis`)
    //     a.getTickLength("y", "x2").then($length => {
    //         expect($length).to.be.greaterThan(0)
    //     })
    // },
    // verifyYAxisTickMarksDisplayed() {
    //     cy.log(`Check tick marks displayed for y axis`)
    //     a.getTickLength("y", "x2").then($length => {
    //         expect($length).to.be.lessThan(0)
    //     })
    // },
    // verifyXAxisGridLinesNotDisplayed() {
    //     cy.log(`Check grid lines not displayed for x axis`)
    //     a.getTickLength("x", "y2").then($length => {
    //         expect($length).to.be.greaterThan(0)
    //     })
    // },
    // verifyXAxisGridLinesDisplayed() {
    //     cy.log(`Check grid lines displayed for x axis`)
    //     a.getTickLength("x", "y2").then($length => {
    //         expect($length).to.be.lessThan(0)
    //     })
    // },
    // verifyYAxisGridLinesNotDisplayed() {
    //     cy.log(`Check grid lines not displayed for y axis`)
    //     a.getTickLength("y", "x2").then($length => {
    //         expect($length).to.be.lessThan(0)
    //     })
    // },
    // verifyYAxisGridLinesDisplayed() {
    //     cy.log(`Check grid lines displayed for y axis`)
    //     a.getTickLength("y", "x2").then($length => {
    //         expect($length).to.be.greaterThan(0)
    //     })
    // },
    // verifyAxisTickLabels(axis, attributeValues) {
    //     a.getAxisTickLabels(axis).should('have.length', attributeValues.length)
    //     for (let index = 0; index < attributeValues; index++) {
    //         le.verifyAxisTickLabel(axis, attributeValues[index], index)
    //     }
    // },
    // verifyAxisTickLabel(axis, attributeValue, index) {
    //     a.getAxisTickLabel(axis, index).invoke("text").should("eq", attributeValue)
    // },
    // verifyRemoveAttributeDoesNotExist(axis) {
    //     a.getAttributeFromAttributeMenu(axis).contains(`Remove`).should("not.exist")
    // },
    // verifyTreatAsOptionDoesNotExist(axis) {
    //     a.getAttributeFromAttributeMenu(axis).contains(`Treat as`).should("not.exist")
    // },
    // verifyAxisMenuIsClosed(axis) {
    //     a.getAttributeFromAttributeMenu(axis).find("div>div").should("not.be.visible")
    // }
}
