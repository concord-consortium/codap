import TableTile from "../support/elements/TableTile";
import CodapObject from "../support/elements/CodapObject";
import CaseCardObject from "../support/elements/CaseCardObject";
import CfmObject from "../support/elements/CfmObject";

const table = new TableTile;
const codap = new CodapObject;
const casecard = new CaseCardObject;
const cfm = new CfmObject;

const baseUrl = `${Cypress.config("baseUrl")}`;
const ext = '.codap';

context('attribute types', () => {
  before(() => {
    var filename = 'attribute-types-test-document',
      dir = '../fixtures/';

    cy.visit(baseUrl)
    cy.wait(3000)

    cfm.openDocFromModal();
    cy.wait(500)
    cfm.openLocalDoc(dir + filename + ext)
    codap.getTableTileTitle().click() //bring the table into focus
  })

  describe('attribute types are rendered correctly', () => {
    it('verify string', () => {
      table.getCell("1", "1", 0).should('contain', 'Arizona');
    })
    it('verify numerical', () => {
      table.getCell("2", "2", 0).should('contain', '48');
    })
    it('verify date', () => {
      table.getCell("3", "3", 0).should('contain', '8/7/2017, 12:01 PM');
    })
    it('verify boolean', () => {
      table.getCell("4", "4", 0).should('contain', 'false');
    })
    it('verify qualitative', () => {
      table.getCell("5", "5", 0).find('span span').should('have.class', 'dg-qualitative-bar');
    })
    it('verify color', () => {
      table.getCell("6", "6", 0).find('span').should('have.class', 'dg-color-table-cell');
    })
    it('verify bounds', () => {
      cy.wait(1500);
      table.getCell("8", "8", 0).find('span').should('have.class', 'dg-boundary-thumb');
    })
    it('verify invalid type', () => {
      table.getCell("9", "9", 0).should('contain',"❌: invalid type(s) for '*'");
    })
    it('verify unrecognized', () => {
      table.getCell("10", "10", 0).should('contain',  "❌: 'Bool|color' is unrecognized");
    })

  })
})