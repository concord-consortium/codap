class PluginAPITester {
    getResourceItems(){
        return cy.get('.di-resources-type-list .di-item')
    }
    getActionItems(){
        return cy.get('.di-action-list .di-item')
    }
    getMessageArea(){
        return cy.get('.di-message-area')
    }
    getSendButton(){
        return cy.get('.di-send-button')
    }
    getResponseArea(){
        return cy.get('#message-log')
    }
    getSentMessageNum(){
        return cy.get('#sentMessages')
    }
    getSuccessNum(){
        return cy.get('#success')
    }
    sendRequest(resource, action, message) {
        this.getResourceItems().contains(resource).click();
        this.getActionItems().contains(action).click();
        this.getMessageArea().clear();
        this.getMessageArea().type(message);
        this.getSendButton().click();
    }
    sendMessage(message) {
        this.getMessageArea().clear();
        this.getMessageArea().type(message);
        this.getSendButton().click();
    }
}
export default PluginAPITester