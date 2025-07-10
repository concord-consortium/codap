import TableTile from "../../support/elements/TableTile";
import CodapObject from "../../support/elements/CodapObject";
import CfmObject from "../../support/elements/CfmObject";

const table = new TableTile;
const codap = new CodapObject;
const cfm = new CfmObject;

const baseUrl = `${Cypress.config("baseUrl")}`;

describe('Sampler plugin', function () {
  before(() => {
    cy.visit(baseUrl);
    cfm.createNewDocument();
    codap.openTile('plugin', 'Sampler')
    cy.wait(2000)
    //run sampler
    cy.getPluginIframe().find('#repeat').clear().type("1{enter}")
    cy.getPluginIframe().find('#speed').type(3 + "{enter}")
    cy.wait(3000)
    cy.getPluginIframe().find('#run').click({force: true})
    codap.getTableTile().should('be.visible');
  })
  it('verify data is shown in table', function () {
    cy.wait(8000)
    table.getCollection().eq(0).within(() => {
      table.getCell(0, 0, 0).find('.dg-numeric').should('contain', 1)
      table.getCell(1, 1, 0).should('contain', "mixer")
      table.getCell(2,2,0).find('.dg-numeric').should('contain',5)
    })
    table.getCollection().eq(1).within(function () {
      table.getCell(0, 0, 0).find('.dg-numeric').should('contain', 1)
    })
    table.getCollection().eq(2).within(function () {
      table.getCell(0, 0, 0).should('not.be.empty', '')
    })
  })
})
