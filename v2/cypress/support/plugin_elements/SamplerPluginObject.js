class SamplerPlugin{
    getSamplerPlugin(){
        return cy.getPluginIframe().find('#tabs #tab-sampler')
    }
}
export default SamplerPlugin