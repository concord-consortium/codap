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

before(() => {
  var filename = 'TableC',
    dir = '../fixtures/';

  cy.visit(baseUrl)
  cy.wait(5000)

  cfm.openDocFromModal();
  cy.wait(500)
  cfm.openLocalDoc(dir + filename + ext)
  // codap.getTableTile().click() //bring the table into focus
  table.changeToCaseCard();
})

context('case card version', () => {
  describe('case card ui', () => {
    it('verify table icon is visible when component is in case card mode', () => {
      casecard.getTableIcon().should('be.visible');
    })
    it('verify case card tool palette is visible', () => {
      table.getTableToolPalette().should('be.visible');
    })
    it('verify navigation button is visible', () => {
      casecard.getCaseCardNavBackIcon().should('exist');
      casecard.getCaseCardNavForwardIcon().should('exist');
    })
    it('verify deselect button is visible', () => {
      casecard.getCaseCardDeselectButton().should('be.visible').and('have.attr', 'disabled');
    })
    it('verify collection info is visible', () => {
      casecard.getCaseCardCollectionHeaderLabel().should('be.visible').and('contain', '179 cases');
    })
    it('verify add attribute icon is visible', () => {
      casecard.getCaseCardAddAttributePlusIcon().should('be.visible');
    })
    it('verify add case plus icon is visible', () => {
      casecard.getCaseCardAddCasePlusIcon().should('be.visible');
    })
    it('verify attribute summaries is displayed', () => {
      casecard.getCaseCardAttributeSummary().should('be.visible').and('have.length', 4)
    })
  })
  describe('case card functionality', () => {
    it('verify navigation with nav arrows', () => {
      let data1 = "dog", data2 = "rabbit";
      casecard.getCaseCardNavForwardIcon().click({force:true});
      casecard.getCaseCardAttributeSummary().should('not.exist')
      casecard.getCaseCardCollectionHeader().should('contain', '1 selected of 179 cases');
      casecard.getCaseCardCell().first().should('contain', data1)
      casecard.getCaseCardNavForwardIcon().click({force:true});
      casecard.getCaseCardCell().first().should('contain', data2)
      casecard.getCaseCardNavBackIcon().click({force:true});
      casecard.getCaseCardCell().first().should('contain', data1)
    })
    it('verify add case', () => {
      let data = ["hamster", "Sun", "52", "13"]
      casecard.getCaseCardAddCasePlusIcon().click();
      casecard.getCaseCardCollectionHeader().should('contain', '1 selected of 180 cases');
      casecard.getCaseCardAttribute().contains('CCAT1').should('be.visible');
      casecard.getCaseCardCell({ multiple: true }).should('contain', '____');
      casecard.getCaseCardCell().each((cell, index, cell_list) => {
        cy.wrap(cell).click()
        casecard.editCaseCardCell(data[index])
      })
      casecard.getCaseCardCell().first().should('contain', data[0])
    })
    it('verify add attribute', () => {
      let attr = 'newAttr';
      casecard.getCaseCardAddAttributePlusIcon().click();
      cy.get(casecard.caseCardAttributeInputEl()).type('{enter}')
      casecard.getCaseCardAttribute().contains(attr).should('be.visible');
    })
    it('verify edit collection header', () => {
      //TODO
    })
    it.skip('verify reorder of attribute', () => { //drag and drop of attribute not working
      let attr = 'newAttr';
      cy.dragAttributeToTarget('card', attr, 'card', 3)
    })
    it.skip('verify create new parent collection', () => { //drag and drop of attribute not working
      let attr = 'CCAT1'
      cy.dragAttributeToTarget('card', attr, 'card collection')
    })

  })
  describe('attribute menu functionality', () => {
    before(() => {
      var filename = '3TableGroups',
        dir = '../fixtures/';

      cfm.closeDocFromFileMenu();
      cfm.closeConfirmDialogMessage();
      cfm.openDocFromFileMenu();
      cy.wait(500)
      cfm.openLocalDoc(dir + filename + ext)
      codap.getTableTileTitle().click() //bring the table into focus
      table.changeToCaseCard();
    })
    it('verify add attribute in child collection', () => {
      let attr = 'newAttr';
      casecard.getCaseCardAddAttributePlusIcon().eq(2).click();
      casecard.getCaseCardCollectionHeader(2).siblings('.react-data-card-row').find(casecard.caseCardAttributeInputEl()).type('{enter}')
      casecard.getCaseCardCollectionHeader(2).siblings('.react-data-card-row').find(casecard.caseCardAttributeEl()).contains(attr).should('be.visible');
    })
    it('verify add attribute in parent collection', () => {
      let attr = 'newAttr2';
      casecard.getCaseCardAddAttributePlusIcon().eq(0).click();
      casecard.getCaseCardCollectionHeader(0).siblings('.react-data-card-row').find(casecard.caseCardAttributeInputEl()).type('{enter}')
      casecard.getCaseCardCollectionHeader(0).siblings('.react-data-card-row').find(casecard.caseCardAttributeEl()).contains(attr).should('be.visible');

    })
    it('verify edit attribute properties', () => { //also verify that attribute description appears on hover
      let attr = 'newAttr', new_attr = "CCAT3";
      table.editAttributeProperty("case card", attr, new_attr) //function not working
    })
    it('verify edit formula', () => { //also verify that formula appears on hover, and color of case item

    })
    it('verify delete formula', () => {//also verify that formula is not visible on hover

    })

    it('verify delete attribute', () => {
      let attr = 'newAttr';
      casecard.getCaseCardAttribute().contains(attr).click();
      casecard.getCaseCardAttributeMenuItem('Delete Attribute').click();
      casecard.getCaseCardAttribute().contains(attr).should('not.exist')
    })
  })
  describe('case card tool palette functionality', () => {

  })
})