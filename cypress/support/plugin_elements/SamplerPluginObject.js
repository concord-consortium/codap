class SamplerPlugin{
    getSamplerPlugin(){
        return cy.getPluginIframe().find('#tabs #tab-devices')
    }
}
export default SamplerPlugin
