import TableTile from "../../support/elements/TableTile";
import CodapObject from "../../support/elements/CodapObject";
import GraphTile from "../../support/elements/GraphTile";

const table = new TableTile;
const codap = new CodapObject;
const graph = new GraphTile

const baseUrl = `${Cypress.config("baseUrl")}`;

context("Lab interactives", function () {
  before(function () {
    cy.visit(baseUrl + '#file=examples:Parachute%20Model');
    //run model
    cy.wait(3000);
    cy.getPluginIframe().find('.ui-slider-handle').eq(0).invoke('text').as('mass')
    cy.getPluginIframe().find('.ui-slider-handle').eq(1).invoke('text').as('parachuteSize')
    cy.getPluginIframe().find('button.start').click();
    cy.wait(5000);
    cy.getPluginIframe().find('button.analyze-data').click()
    cy.wait(500)
  })
  describe('Lab interactives with Parachute Model', function () {
    it('verify data is shown in table', function () {
      // codap.openTile('table', "runs/measurements")
      table.getCollection().eq(0).within(() => {
        table.getCell(1, 1, 0).find('.dg-numeric').should('contain', 1)
        table.getCell(2, 2, 0).find('.dg-numeric').should('contain', this.mass)
        table.getCell(3, 3, 0).find('.dg-numeric').should('contain', this.parachuteSize)
      })
      table.getCollection().eq(1).within(function () {
        table.getCell(1, 1, 0).find('.dg-numeric').eq(0).should('not.be.empty')
        table.getCell(2, 2, 0).find('.dg-numeric').eq(0).should('not.be.empty')
        table.getCell(3, 3, 0).find('.dg-numeric').eq(0).should('not.be.empty')
      })
    })
  })
})