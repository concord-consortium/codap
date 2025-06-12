import Document from './Document'
const document= new Document

class Sage {
  getToolbarButton(button) {
    return cy.getSageIframe().find('.iframed-workspace .misc-actions.toolbar .toolbar-button div').contains(button)
  }
  openNewTableTile() {
    cy.getSageIframe().find('.iframed-workspace .codap-table-menu .codap-table-menu-item button').click()
  }
  openSageTableTile(title) {
    cy.getSageIframe().find('.iframed-workspace .codap-table-menu .codap-table-menu-item').contains(title).click()
  }
  nodeName() {
    return ('.node-title-box');
  }
  nodeNameInput() {
    return ('input.node-title');
  }
  node() {
    return ('.elm.ui-draggable')
  }
  nodeLinkButton() {
    return ('.node-link-button')
  }
  relationshipArrow() {
    return ('.jsplumb-connector')
  }

  addNode(posX, posY, name) {
    cy.log('in addNode');
    cy.getSageIframe().find(document.paletteNode())
      .trigger('mousedown', { which: 1 });
    cy.getSageIframe().find(document.canvas())
      .trigger('mousemove', { pageX: posX, pageY: posY })
      .trigger('mouseup', { force: true });
    cy.wait(1000);
    cy.getSageIframe().find(this.nodeNameInput({ force: true })).last().click({ force: true }).type(name + '{enter}', { force: true }); //There's a bizarre behavior that if you watch the test happening, it will not input the text. But if you let it run in the background, it will input the text. Tried in Chrome and Electron
    cy.wait(1000);
  };

  addRelationship() { //only adds relationship from first added noded and last added node
    cy.getSageIframe().find(this.nodeLinkButton()).first()
      .trigger('mousedown', { which: 1 });
    cy.getSageIframe().find(this.node()).last()
      .trigger('mousemove')
      .trigger('mouseup', { force: true })
  }

  getAddedNode(nodeName) {
    return cy.getSageIframe().find(".iframed-workspace .link-target[data-node-key="+nodeName+"]");
  }
  getNodeGraphButton(nodeName) {
    return this.getAddedNode(nodeName).find('.icon-codap-graph');
  }

  //Sage Tool Palette
  getRelationshipTool(){
    return cy.getSageIframe().find(".iframed-workspace .icon-codap-qualRel")
  }
  selectRelationship(relationship){
    cy.getSageIframe().find(".iframed-workspace .bb-select select").eq(0).select(relationship);
  }
  selectRelationshipRate(rate){
    cy.getSageIframe().find(".iframed-workspace .bb-select.visible select").select(rate);
  }

  runSimulation() {
    cy.getSageIframe().find(document.simulateToggleExpand()).click();
    cy.getSageIframe().find(document.recordDataStreamButton()).contains("Continuously").click();
  }
  moveNodeSlider(node, y) {
    cy.getSageIframe().find('.slider[data-node-key='+node+'] .value-slider-handle')
      .trigger('mousedown', {which: 1})
      .trigger('mousemove',  0 , y, {force:true})
      .trigger('mouseup')
  }
}
export default Sage;
