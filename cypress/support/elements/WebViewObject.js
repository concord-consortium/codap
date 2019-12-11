class WebviewTile {
    getWebviewTile(){
        return cy.get('.dg-web-view');
    }
    getGuideViewTile(){
        return cy.get('.sc-web-view')
    }
}
export default WebviewTile