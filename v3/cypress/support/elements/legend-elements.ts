export const LegendElements = {
    getGraphTile() {
        return cy.get(".codap-graph")
    },
    getLegend() {
        return this.getGraphTile().find(".graph-plot .legend")
    },
    getLegendName() {
        return this.getLegend().find(".legend-label")
    },
    getCategoricalLegendCategories() {
        return this.getLegend().find(".legend-categories>.key")
    },
    getCategoricalLegendCategory(name) {
        return this.getCategoricalLegendCategories().contains(name)
    },
    getNumericalLegendCategories() {
        return this.getLegend().find(".legend-categories>svg rect")
    },
    getLegendAttributeMenu() {
        return this.getGraphTile().find(".axis-legend-attribute-menu:nth-child(7)>button")
    },
    getAttributeFromLegendMenu() {
        return this.getLegendAttributeMenu().parent()
    }
}
