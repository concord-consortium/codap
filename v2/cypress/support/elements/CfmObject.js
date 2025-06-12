class CfmObject{
    openCFMMenu(){
        cy.get('.cfm-menu.menu-anchor .default-anchor ').click();
    }
    getOpenDocButton(){
        return cy.get('button').contains("Open Document");
    }
    getCreateNewDocButton(){
        return cy.get('button').contains("Create New Document");
    }
    getOpenExampleTab(){
        return cy.get('.workspace-tabs').contains('Example Documents')
    }
    getOpenGoogleDocTab(){

    }
    getLocalFileTab(){
        return cy.get('.workspace-tabs').contains('Local File')
    }
    getFileSelectionDropArea(){
        return ('.dropArea > input');
    }
    createNewDocument(){
        this.getCreateNewDocButton().click();
    }
    openExampleDoc(document){
        this.getOpenExampleTab().click();
        cy.get('.filelist .selectable').contains(document).click();
        cy.get('button').contains('Open').click();
    }
    openDocFromModal(){
        this.getOpenDocButton().click();
    }
    openDocFromFileMenu(){
        this.openCFMMenu();
        this.selectCFMMenuItem('Open...');
    }
    openLocalDoc(filename){
        this.getLocalFileTab().click();

        cy.uploadFile(this.getFileSelectionDropArea(), filename, 'application/json');
        cy.get(this.getFileSelectionDropArea())
            .trigger('drop')
        cy.wait(3000)
    }
    closeDocFromFileMenu(){
        this.openCFMMenu();
        this.selectCFMMenuItem('Close')
    }
    closeConfirmDialogMessage(){
        cy.get('.confirm-dialog button').contains('Yes').click();
    }
    selectCFMMenuItem(item){
        cy.get('.cfm-menu .menuItem').contains(item).click();
    }
    saveToGoogleDrive(filename){

    }
    saveToLocalDrive(filename){
        this.openCFMMenu();
        this.selectCFMMenuItem('Save');
        this.getLocalFileTab().click();
        cy.get('.modal-dialog-workspace .dialogTab.localFileSave input').click().clear().type(filename);
        cy.get('.buttons a').contains('Download').click();
    }
}
export default CfmObject;