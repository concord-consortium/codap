class TextTile{
    getTextTile(){
        return cy.get('.dg-text-view-edit-view');
    }
    getTextArea() {
        return cy.get('[data-testid=slate-editor]');
    }
    //$('textarea')[0].value
//"save and restore"
}
export default TextTile