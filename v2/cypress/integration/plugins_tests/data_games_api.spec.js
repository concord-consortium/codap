import TableTile from "../../support/elements/TableTile";
import CodapObject from "../../support/elements/CodapObject";
import GraphTile from "../../support/elements/GraphTile";

const table = new TableTile;
const codap = new CodapObject;
const graph = new GraphTile

const baseUrl = `${Cypress.config("baseUrl")}`;

context('Data Games API', () => {
  before(function () {
    cy.visit(baseUrl + '#file=examples:Markov%20Game');
    codap.openTile('graph')
    codap.openTile('table', 'Games/Turns')
    cy.wait(5000)

    cy.getPluginIframe().find('#levelName').invoke('text').as('level')
    // run game
    cy.getPluginIframe().find('#rock_button').click()
    cy.getPluginIframe().find('#paper_button').click()
    cy.getPluginIframe().find('#scissors_button').click()
    cy.getPluginIframe().find('#rock_button').click()
    cy.getPluginIframe().find('#paper_button').click()
    cy.getPluginIframe().find('#scissors_button').click()
    cy.getPluginIframe().find('#game_button').click()
  })
  describe('Markov', function () {
    it('verify data is shown in table', function () {
      table.getCollection().eq(0).within(() => {
        table.getCell(1, 1, 0).find('.dg-numeric').should('contain', 1)
        table.getCell(4, 4, 0).should('contain', this.level)
      })
      table.getCollection().eq(1).within(() => {
        table.getCell(1, 1, 0).find('.dg-numeric').should('contain', 1)
        table.getCell(3, 3, 0).should('contain', "R")
        table.getCell(6, 6, 0).should('contain', '')
      })
    })
    it('verify graph axes label', function () {
      graph.getHorizontalAxisLabel().should('contain', 'previous_2_markov_moves')
      graph.getLeftVerticalAxisLabel().should('contain', 'markovs_move')
    })
    it('verify there are data points on the graph', function () {
      graph.getDataDotColored().should('have.length', 6)
    })
  })
})