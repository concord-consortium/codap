class DrawToolPlugin{
    getDrawToolPlugin(){
        return cy.getPluginIframe().find('#camera-flash')
    }
}
export default DrawToolPlugin