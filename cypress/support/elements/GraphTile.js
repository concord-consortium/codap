class GraphTile {
    // Graph Plot Area
    getGraphTile(){
        return cy.get('.dg-graph-view')
    }
    getHorizontalAxis(){
        return cy.get('.dg-axis-view.dg-h-axis')
    }
    getHorizontalAxisLabel(){
        return cy.get('.dg-axis-view.dg-h-axis .dg-axis-label')
    }
    getLeftVerticalAxis(){
        return cy.get('.dg-axis-view.dg-v-axis')
    }
    getLeftVerticalAxisLabel(){
        return cy.get('.dg-axis-view.dg-v-axis .dg-axis-label')
    }
    getRightVerticalAxis(){
        return cy.get('.dg-v2-axis')
    }
    getRightVerticalAxisLabel(){
        return cy.get('.dg-v2-axis .dg-axis-label')
    }
    getPlotView(){
        return cy.get('.dg-plot-view')
    }
    getDataDot(){
      return cy.get('.dg-data-dot')
  }
    getDataDotColored(){
        return cy.get('.dg-data-dot-colored')
    }
    getLegend(){
        return cy.get('.dg-legend-view')
    }
    getLegendLabel(){
        return cy.get('.dg-legend-view .dg-axis-label')
    }
    changeAxisAttribute(hash){ //{attribute:'ACAT1', axis:'graph_legend1', collection:'Table A'}
        var attribute = hash.attribute,
            axis = hash.axis,
            collection = hash.collection;
        switch(axis) {
            case('x1') :
                this.getHorizontalAxis().click();
                cy.clickMenuItem(collection);
                cy.clickMenuItem(attribute);
                return
            case('x') :
                this.getHorizontalAxisLabel()
                    .trigger('mousemove', {force:true})
                    .click({force:true});
                cy.clickMenuItem(collection);
                cy.clickMenuItem(attribute);
                return
            case('y1') : //first time clicking on the y axis, label does not exist yet.
                this.getLeftVerticalAxis().click();
                cy.clickMenuItem(collection);
                cy.clickMenuItem(attribute);
                return
            case('y') :
                this.getLeftVerticalAxisLabel()
                    .trigger('mousemove', {force:true})
                    .click({force:true});
                cy.clickMenuItem(collection);
                cy.clickMenuItem(attribute);
                return
            case('graph_legend1') :
                cy.dragAttributeToTarget('table', attribute, axis)
                return
            case('graph_legend') :
                this.getLegendLabel()
                    .trigger('mousemove', {force:true})
                    .click({force:true});
                cy.clickMenuItem(collection);
                cy.clickMenuItem(attribute);
                return
        }
        cy.wait(4000)
    }
    removeAxisAttribute(axis){
        switch(axis) {
            case('x'):
                this.getHorizontalAxisLabel().click();
                break
            case('x1'):
                this.getHorizontalAxisLabel().click();
                break
            case('y'):
                this.getLeftVerticalAxisLabel().click();
                break
            case('y1'):
                this.getLeftVerticalAxisLabel().click();
                break
            case('legend'):
                this.getLegendLabel().click();
                break
        }
        cy.clickMenuItem('Remove')
    }

    //Graph adornments
    getCountAdorn(){
        return cy.get('.dg-graph-adornment-count')
    }
    getValueFormulaLabel(){
        return cy.get('.sc-text-field-accessory-view.dg').last()
    }

    //Formula Dialog
    getDialogApplyButton(){
        return cy.get('.dg-formula-dialog-apply');
    }
    enterFormula(formula){
        cy.get('.dg-formula-dialog-input-field .CodeMirror textarea').click({force:true}).clear({force:true}).type(formula, {force:true});
        this.getDialogApplyButton().click();
    }
    //Graph Tool Palette

    //Graph Ruler Palette
    clickRulerTool(){
        cy.get('.dg-display-values').click();
    }
    //Graph Eye Icon Palette
    clickEyeTool() {
        cy.get('.moonicon-icon-hideShow').click();
    }
    clickShowParentVisibilityToggles() {
        cy.get('.dg-display-hideshow-popup .sc-menu-item a').contains('Show Parent Visibility Toggles').parent().click();
    }
    turnOnRulerTool(tool) {
        cy.get('.dg-graph-'+tool+'-check').click({animationDistanceThreshold: 20});
    }
    turnOffRulerTool(tool){ //same as turnOnRulerTool but here for test clarity
        cy.get('.dg-graph-'+tool+'-check').click({animationDistanceThreshold: 20});
    }
    getMovableValueButton(){
        return cy.get('.dg-movable-value-button')
    }
    getMeanLine(){
        return cy.get('.dg-graph-view svg [stroke-width="5"]')
    }
    hoverMeanLine(){
        return cy.get('.dg-graph-view svg path[stroke="#ffffff"]').first().click({ force: true })
    }
    getGraphAdornmentText(){
        return cy.get('.dg-graph-adornment tspan').last().text()
    }
    getGraphEquationView(){
      return cy.get('.dg-equationview')
    }
    getLSLine(){
        return cy.get('.dg-graph-view svg [stroke="#008000"]')
    }
}
export default GraphTile
