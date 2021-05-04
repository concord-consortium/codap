import TableTile from "../../support/elements/TableTile";
import CodapObject from "../../support/elements/CodapObject";
import GraphTile from "../../support/elements/GraphTile";

const table = new TableTile;
const codap = new CodapObject;
const graph = new GraphTile

const baseUrl = `${Cypress.config("baseUrl")}`;

context('Onboarding plugin to CODAP', () => {
  before(() => {
    cy.visit(baseUrl + '#file=examples:Getting%20started%20with%20CODAP');
    cy.wait(5000)
  })

  describe('Getting started with CODAP plugin', () => {
    it('verify graph check on plugin', () => {
      codap.openTile('graph')
      cy.wait(1000);
      cy.getPluginIframe().find('input.App-checkbox[name=MakeGraph]').should('be.checked')
    })
  })

  it.skip('should drag the csv to document', function () {
    var dt = new DataTransfer

    cy.getPluginIframe().find('.App-link img')
      .trigger('dragstart', { dt })
    cy.get('.dg-container-view')
      .trigger('drop', { dt })
      .trigger('dragend')
  })

})