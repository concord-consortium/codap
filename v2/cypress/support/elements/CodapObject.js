import TableTile from './TableTile'
import GraphTile from './GraphTile'

const table = new TableTile;
const graph = new GraphTile;

class CodapObject{
    openTile(tile, menuItem){
        const menuButtons = ['table', 'plugin', 'tilelist', 'option', 'help', 'guide']                
        cy.get('.dg-'+tile+'-button').click();
        if (menuButtons.includes(tile)){
            cy.clickMenuItem(menuItem)
        }
    }
    closeTile(tile, title){
        var el='';
        switch (tile) {
            case 'graph':
                el = '.dg-graph-view';
                break;
            case 'table':
                el = '.dg-hier-table-view';
                break;
            case 'plugin':
                el = '.dg-web-view';
                break;
            case 'option':
                el = '.dg-web-view';
                break;
            case 'help':
                el = '.dg-web-view';
                break;
        }
        cy.get(el).siblings('.dg-titlebar').children('.dg-titleview').contains(title)
            .trigger('mouseover')
            .then(function(){
                cy.get(el).siblings('.dg-titlebar').children('.dg-titleview').contains(title).siblings('.dg-close-icon')
                .click({force:true})
            })
            // .siblings('.dg-close-icon')
            // .trigger('mouseover').click({force:true})

        // cy.get('.dg-titleview').contains(tile).siblings('.dg-close-icon').invoke('show').click({force:true})
    }
    minimizeTile(){//right now assumes there is only one tile open
        cy.get('.dg-minimize-view').last().invoke('show').click({force:true})
    }
    getTableTile(){
        return cy.get('.dg-case-table-component-view')
    }
    getComponentViews(){
        return cy.get('.dg-component-view')
    }
    getTableTileTitle(){
        return cy.get('.dg-case-table-component-view .dg-titlebar')
    }
    getGraphTileTitle(){
        return cy.get('.dg-graph-view').siblings('.dg-titlebar').children('.dg-titleview');
    }
    dragAttributeToGraph(source,target){
        // table.getAttributeHeader(source)
        //     .trigger('mousedown', {which:1})
        // graph.getGraphTile()    
        //     .trigger('mousemove')
        //     .trigger('mouseup', {which:1})
        // cy.get('.slick-header-column .two-line-header-line-1').contains(source)
        //     .trigger('mousedown', {which:1},{dt})
        //     .trigger('dragstart', {dt});
        // graph.getGraphTile()
        //     .trigger('mousemove',{which:1},{dt})
        //     .trigger('mousemove', {force:true},{which:1},{dt})
        //     .trigger('mouseup', {force:true}, {which:1}, {dt})
    }
    getSingleDialog(){
        return cy.get('.dg-single-text-dialog-textfield')
    }
    getSingleDialogTextField(){
        return cy.get('.dg-single-text-dialog-textfield input')
    }
    getSingleDialogOKButton(){
        return cy.get('.dg-single-text-dialog-ok')
    }
    singleDialogEntry(text){
        this.getSingleDialogTextField().type(text)
        this.getSingleDialogOKButton().click()
    }
    undo(){
        cy.get('.moonicon-arrow-undo').click();
    }
}
export default CodapObject
