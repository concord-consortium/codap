import TableTile from "../support/elements/TableTile";
import CodapObject from "../support/elements/CodapObject";
import CaseCardObject from "../support/elements/CaseCardObject";
import CfmObject from "../support/elements/CfmObject";
import MapTile from '../support/elements/MapTile';
import SliderTile from '../support/elements/SliderObject';
import TextTile from '../support/elements/TextObject';
import CalculatorTile from '../support/elements/CalculatorObject';
import SamplerPlugin from '../support/elements/SamplerPluginObject';
import DrawToolPlugin from '../support/elements/DrawToolObject';
import GraphTile from '../support/elements/GraphTile'

const table = new TableTile;
const codap = new CodapObject;
const cfm = new CfmObject;
const casecard = new CaseCardObject;
const graph = new GraphTile;
const map = new MapTile;
const slider = new SliderTile
const textTile = new TextTile
const calculator = new CalculatorTile
const sampler = new SamplerPlugin
const drawTool = new DrawToolPlugin

const ext = '.codap';

//table, graph and map restore are not tested here because they are tested elsewhere
//Table = table_save_and_restore_test.spec.js
//Graph = example_docs_test.js
//Map = example_docs_test.js

before(()=> {
    cy.viewport(1400,1000);
    cy.visit('https://codap.concord.org/releases/staging/')
    cy.wait(5000)
}) 

context('CFM functionalities with table', ()=>{

    it('verify restore of all components', ()=>{ //test to see if a blank table is saved properly.
        var filename='save_restore_test_doc',
            dir='../fixtures/';

        cfm.openDocFromModal();
        cy.wait(500)
        cfm.openLocalDoc(dir+filename+ext);
        codap.getComponentViews().should('have.length', 13);
    })

    it('verify case card restore', ()=>{
        casecard.getCaseCardTile().should('be.visible').and('contain','1–9 ');
    })

    // it('verify web page restore',()=>{
    //     cy.getWebviewIframe().find('.concord-logo').should('be.visible')
    // })
    it('verify text box restore', ()=>{
        textTile.getTextTile().should('be.visible');
        textTile.getTextTile().should('have.class', 'not-empty');
        textTile.getTextArea().then(($textarea)=>{
            expect($textarea[0].value).to.contain('save and restore')
        })
    })

    // it('verify DrawTool restore', ()=>{ //no way to verify contents of the canvas
    //     cy.getPluginIframe().find('#camera-flash').should('be.visible')
    // })
    it('verify slider restore', ()=>{
        slider.getSliderTile().should('be.visible');
    })
})   