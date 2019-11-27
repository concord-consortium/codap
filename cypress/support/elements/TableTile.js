class TableTileObject{
    getCaseTableTile(){
        return cy.get('.dg-hier-table-view');
    }
    getCollection(){
        return cy.get('.dg-case-table-title')
    }
    getAttributeHeader(){
        return cy.get('.slick-column-name .two-line-header-line-1')
    }
    getCaseCardIcon(){
        return cy.get('.dg-card-icon')
    }
    getTableIcon(){
        return cy.get('.dg-table-icon')
    }
    getAddNewAttributePlusIcon(collection){
        return cy.get('.dg-case-table-title').contains(collection).siblings('.dg-floating-plus')
    }
    getAttribute(name){
        return cy.get('.two-line-header-line-1*=').contains(name);
    }
    changeToCaseCard(){
        cy.get('.dg-card-icon').click();
        cy.clickMenuItem('Switch to case card view of the data')
    }
    changeToTable(){
        cy.get('.dg-table-icon').click();
        cy.clickMenuItem('Switch to case table view of the data')
    }
    addNewAttribute(collection){
        //Have to find the appropriate collection
        this.getAddNewAttributePlusIcon(collection).click();
    }
    getCollection(){
        return cy.get('.dg-case-table-view')
    }
    getCollectionTitle(){
        return cy.get('.dg-case-table-title')
    }
    getCollectionByName(collection){
        return cy.get('.dg-case-table-title').contains(collection);
    }
    getExpandIcon(){
        return cy.get('.dg-table-drop-target image')
    }
    getExpandAllIcon(){
        return cy.get('.dg-table-drop-target .slick-header image')
    }
    getCollapseIcon(){
        return cy.get('.dg-table-drop-target image')
    }
    getCollapseAllIcon(){
        return cy.get('.dg-table-drop-target .slick-header image')
    }
    getCell(){
        //get collection name
        //get the .dg-case-table sibling of the .dg-case-table-title
        //get the child .slick-cell of the found .dg-case-table
    }
    getIndex(){
        return cy.get('.dg-index')
    }
    getIndexMenu(){
        return cy.get('.dg-case-index-popup')
    }
    openIndexMenu(index_num){ //currently only opens the last occurence of that index number. Index nums are in an array of all indexes, not separated by collection
        //Ideally, get collection to know which index num in the array to click on
        //click on index num
        this.getIndex().then(($index_arr)=>{
            $index_arr[index_num].click();
        })
    }
    insertCase(index_um){
        
    }
    insertCases(){

    }
    deleteCases(){

    }
    
    //Attribute menu
    openAttributeMenu(attr){
        //get collectionname
        //get attr
        //click on attr
    }
    selectMenuItemFromAttributeMenu(item){
        cy.get('.slick-header-menucontent').contains(item).click();
    }
    editAttributeProperty(name, description, type, unit, precision, editable){
        this.openAttributeMenu(attr);
        this.selectMenuItemFromAttributeMenu('editAttributeProp');
        if (!name==null) {
            this.enterName(name);
        }
        if (!description==null) {
            this.enterDescription(description);
        }
        if (!type==null) {
            this.enterType(type);
        }
        if (!unit==null) {
            this.enterUnit(unit);
        }
        if (!precision==null) {
            this.enterPrecision(precision);
        }
        if (!editable==null) {
            this.enterEditable(editable);
        }
        this.applyAttrProperty();
    }
    editFormula(formula){

    }

    //Edit Attribute Property Dialog



    //Edit Formula Dialog


    //Table tool palette
    getTableToolPalette(){
        return cy.get('.dg-case-table-component-view').siblings('.dg-inspector-palette')
    }
    getRescaleTable(){
        return cy.get('.moonicon-icon-scaleData')
    }
    getTrashIconMenu(){
        return cy.get('.moonicon-icon-trash')
    }
    getOpenEyeIconMenu(){
        return cy.get('.moonicon-icon-hideShow')
    }
    getRulerIconMenu(){
        return cy.get('.moonicon-icon-values')
    }
    rescaleTable(){
        this.getRescaleTable().click();
    }
    openTrashIconMenu(){
        this.getTrashIconMenu().click();
    }
    openEyeIconMenu(){
        this.getOpenEyeIconMenu().click();
    }
    openRulerIconMenu(){
        this.getRulerIconMenu().click();
    }

    //Ruler options
    addNewAttributeInRuler(collection){
        cy.clickMenuItem('New Attribute in '+ collection);
    }

}
export default TableTileObject