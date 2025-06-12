class WebviewTile {
    getWebviewTile(){
        return cy.get('.dg-web-view');
    }
    getGuideTile(){
        return cy.get('.sc-web-view')
    }
    getPlugin(){
        return cy.get('.dg-game-view');
    }
}
export default WebviewTile