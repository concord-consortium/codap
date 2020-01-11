class Plugin{
    getPlugin(){
        return cy.get('.dg-game-view');
    }
    getSamplerPlugin(){
        return cy.getPluginIframe().find('#tabs #tab-sampler')
    }
}
export default Plugin