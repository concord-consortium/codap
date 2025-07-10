import CodapObject from "../support/elements/CodapObject";
import CaseCardObject from "../support/elements/CaseCardObject";
import CfmObject from "../support/elements/CfmObject";
import SliderTile from '../support/elements/SliderObject';
import TextTile from '../support/elements/TextObject';
import CalculatorTile from '../support/elements/CalculatorObject';
import SamplerPlugin from '../support/plugin_elements/SamplerPluginObject';

const codap = new CodapObject;
const cfm = new CfmObject;
const casecard = new CaseCardObject;

const slider = new SliderTile
const textTile = new TextTile
const calculator = new CalculatorTile
const samplerPlugin = new SamplerPlugin

const ext = '.codap';

//table, graph and map restore are not tested here because they are tested elsewhere
//Table = table_save_and_restore_test.spec.js
//Graph = example_docs_test.js
//Map = example_docs_test.js

const baseUrl = `${Cypress.config("baseUrl")}`;

before(() => {
  cy.visit(baseUrl)
  cy.wait(5000)
})

context('Tile variety', () => {

  it('verify restore of all components', () => { //test to see if a blank table is saved properly.
    var filename = 'save_restore_test_doc',
      dir = '../fixtures/';

    cfm.openDocFromModal();
    cy.wait(500)
    cfm.openLocalDoc(dir + filename + ext);
    codap.getComponentViews().should('have.length', 13);
    cy.wait(2000)
  })

  it('verify case card restore', () => {
    casecard.getCaseCardTile().should('be.visible').and('contain', '1–9 ');
  })

  it('verify web page restore', () => {
    cy.wait(5000)
    cy.getWebviewIframe(2).find('.logo').should('exist')
  })
  it('verify text box restore', () => {
    textTile.getTextTile().should('be.visible');
    textTile.getTextTile().should('contain', 'save and restore')
  })

  it('verify DrawTool restore', () => { //no way to verify contents of the canvas
    cy.getPluginIframe(1).find('#camera-flash').should('be.visible')
  })
  it('verify slider restore', () => {
    slider.getSliderTile().should('be.visible');
  })
  it('verify calculator restore', () => {
    calculator.getCalculatorTile().scrollIntoView().should('be.visible');
  })
  it('verify Sampler plugin restore', () => {
    samplerPlugin.getSamplerPlugin().should('be.visible');
  })
})
