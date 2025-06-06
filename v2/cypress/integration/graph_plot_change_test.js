import GraphTile from "../support/elements/GraphTile"
import TableTile from "../support/elements/TableTile"
import CodapObject from "../support/elements/CodapObject";
import CfmObject from "../support/elements/CfmObject";

const graph = new GraphTile
const table = new TableTile
const codap = new CodapObject
const cfm = new CfmObject;

const baseUrl = `${Cypress.config("baseUrl")}`;
const filename = '3TableGroups',
  ext = '.codap',
  dir = '../fixtures/';

const arrayOfPlots = [{ attribute: 'ACAT1', axis: 'x1', collection: 'Table A' },
                      { attribute: 'ACAT2', axis: 'y1', collection: 'Table A' },
                      { attribute: 'ANUM1', axis: 'x', collection: 'Table A' },
                      { attribute: 'ANUM2', axis: 'y', collection: 'Table A' },
                      { attribute: 'BCAT1', axis: 'x', collection: 'Table B' },
                      { attribute: 'BNUM1', axis: 'x', collection: 'Table B' },
                      { attribute: 'CCAT1', axis: 'x', collection: 'Table C' },
                      { attribute: 'CNUM1', axis: 'x', collection: 'Table C' },
                      { attribute: 'BNUM1', axis: 'y', collection: 'Table B' },
                      { attribute: 'CCAT2', axis: 'x', collection: 'Table C' },
                      { attribute: 'BCAT1', axis: 'y', collection: 'Table B' },
                      { attribute: 'ACAT2', axis: 'y', collection: 'Table A' },
                      { attribute: 'ACAT1', axis: 'graph_legend', collection: 'Table A' },
                      { attribute: 'CNUM1', axis: 'y', collection: 'Table C' },
                      { attribute: 'BNUM1', axis: 'x', collection: 'Table B' },
                      { attribute: 'ANUM1', axis: 'graph_legend', collection: 'Table A' },
                      { attribute: 'BCAT1', axis: 'x', collection: 'Table B' },
                      { attribute: 'CCAT2', axis: 'y', collection: 'Table C' }
                    ]

before(function () {
  cy.visit(baseUrl)
  cy.wait(5000)
})
context('Graph variety', () => {
  it('verify restore of graph types', () => { //test to see if a blank table is saved properly.
    var filename = 'CODAP Graph Vocabulary',
      ext = ".codap",
      dir = '../fixtures/';

    cfm.openDocFromModal();
    cfm.openLocalDoc(dir + filename + ext);
    codap.getComponentViews().should('have.length', 27);
    cy.matchImageSnapshot(filename)
  })
  after(function () {
    cfm.closeDocFromFileMenu()
  })
})

context('Test Graph Plot Transitions', () => {
  before(function () {
    cfm.openDocFromFileMenu();
    cy.wait(500)
    cfm.openLocalDoc(dir + filename + ext)
  })
  it('will add attributes to a graph and verify plot transitions are correct', () => {
    codap.openTile('graph')
    cy.wait(3000);
    cy.wrap(arrayOfPlots).each((hash, index, list) => {
      cy.log("attribute: " + hash.attribute)
      cy.dragAttributeToTarget('table', hash.attribute, hash.axis)
      cy.log("after drag attribute")
      cy.wait(2000);
      cy.matchImageSnapshot(hash.attribute + '_on_' + hash.axis)
    })
  })
  after(function () {
    cfm.closeDocFromFileMenu()
  })
})
//TODO: Need to add side by side transitions and right vertical axis