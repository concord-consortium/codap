import CaseCardObject from "./CaseCardObject";

const casecard = new CaseCardObject;

class TableTileObject{
    getCaseTableTile(){
        return cy.get('.dg-hier-table-view');
    }
    getAttributeHeader(){
        return cy.get('.slick-column-name .two-line-header-line-1')
    }
    getCaseCardIcon(){
        return cy.get('.dg-card-icon')
    }
    getAddNewAttributePlusIcon(collection){
        return cy.get('.dg-case-table-title').contains(collection).siblings('.dg-floating-plus')
    }
    getColumnHeader(){
        return cy.get('.slick-header-column')
    }
    getAttribute(name){
        return cy.get('.two-line-header-line-1').contains(name);
    }
    changeToCaseCard(){
        cy.get('.dg-card-icon').click({force:true});
        cy.clickMenuItem('Switch to case card view of the data')
    }

    addNewAttribute(collection){
        //Have to find the appropriate collection
        cy.get('.dg-case-table-component-view .dg-titlebar').click();
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
    getCell(line, row, instance){//line and row have to be in quotes since it's getting appended as part of text
        //get collection name
        //get the .dg-case-table sibling of the .dg-case-table-title
        //get the child .slick-cell of the found .dg-case-table

        //made it simpler for now.
        return cy.get('.slick-cell.l'+line+'.r'+row).eq(instance)
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
    insertCase(index_num){
        this.openIndexMenu(index_num);
        cy.clickMenuItem('Insert Case')
    }
    insertCases(index_num, num_of_cases, location){ //location is before or after insertion point
        this.openIndexMenu(index_num);
        cy.clickMenuItem('Insert Cases')
        cy.get('.dg-insert-cases-dialog .dg .field').type(num_of_cases)
        cy.get('.dg-insert-cases-dialog .sc-button-label').contains(location).click();
        cy.get('.dg-insert-cases-dialog .sc-button-label').contains('Insert Cases').click();
    }
    deleteCase(index_num, num_of_cases){
        this.openIndexMenu(index_num);
        cy.clickMenuItem('Delete Case')
    }

    //Case card view


    //Attribute menu
    openAttributeMenu(attr){
        this.getAttribute(attr).click();
    }

    getAttributeMenuItem(item){
        return cy.get('.slick-header-menucontent').contains(item)
    }
    selectMenuItemFromAttributeMenu(item){
        this.getAttributeMenuItem(item).click();
    }
    getApplyButton(){
        return cy.get('.button label').contains('Apply');
    }

    editFormula(attr, formula){
        this.openAttributeMenu(attr);
        this.selectMenuItemFromAttributeMenu('Edit Formula...');
        this.enterFormula(formula);
        this.getApplyButton().click();
    }
    getApplyButton(){
        return cy.get('.button label').contains('Apply');
    }
    getCancelButton(){
        return cy.get('.button label').contains('Cancel');
    }
    //Edit Attribute Property Dialog
    enterAttributeName(name){
        cy.log('in enterAttributeName')
        cy.get('.dg.panel input').eq(0).type(name);
    }
    enterAttributeDescription(text){
        cy.get('.dg.panel textarea').type(text);
    }
    selectAttributeType(type){
        cy.get('.dg.popup.button').eq(0);
        cy.clickMenuItem(type);
    }
    enterAttributeUnit(unit){
        cy.get('.dg.panel input').eq(1).type(name);
    }
    selectAttributePrecision(number){
        cy.get('.dg.popup.button').eq(1);
        cy.clickMenuItem(number);
    }
    selectAttributeEditableState(state){
        cy.get('.radiogroup span').contains(state);
    }
    //Edit Formula Dialog
    enterFormula(formula){
        cy.get('.dg-formula-dialog-input-field textarea').eq(1).type(formula, {force:true});
    }

    //Tool palette
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
    editAttributeProperty(state,attr, name, description, type, unit, precision, editable){
        switch (state) {
            case ("table") :
                this.openAttributeMenu(attr);
                this.selectMenuItemFromAttributeMenu('Edit Attribute Properties...');
            case ("case card") :
                casecard.openCaseCardAttributeMenu(attr);
                casecard.selectMenuItemFromCaseCardAttributeMenu('Edit Attribute Properties...');
        }
        if (!name=="") {
            cy.log("name: "+name)
            // this.enterAttributeName(name);
            cy.get('.dg.panel input').eq(0).type("{selectall} {backspace}"+name);
            this.getApplyButton().click();
        }
        if (!description==null) {
            this.enterAttributeDescription(description);
        }
        if (!type==null) {
            this.selectAttributeType(type);
        }
        if (!unit==null) {
            this.enterAttributeUnit(unit);
        }
        if (!precision==null) {
            this.enterAttributePrecision(precision);
        }
        if (!editable==null) {
            this.selectAttributeEditableState(editable);
        }
    }
}
export default TableTileObject
