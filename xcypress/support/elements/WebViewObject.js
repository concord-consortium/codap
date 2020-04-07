class WebviewTile {
    getWebviewTile(){
        return cy.get('.dg-web-view');
    }
    getGuideTile(){
        return cy.get('.sc-web-view')
    }
}
export default WebviewTile