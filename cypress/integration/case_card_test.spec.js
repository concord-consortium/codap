import TableTile from "../support/elements/TableTile";
import CodapObject from "../support/elements/CodapObject";
import CaseCardObject from "../support/elements/CaseCardObject";
import CfmObject from "../support/elements/CfmObject";

const table = new TableTile;
const codap = new CodapObject;
const casecard = new CaseCardObject;
const cfm = new CfmObject;

const dir = '../../../../Downloads/';
const filename='3TableGroups',
      ext = '.json';
before(()=> {
    cy.viewport(1400,1000);
    cy.visit('https://codap.concord.org/releases/staging/?url=https://codap.concord.org/~eireland/3TableGroups.json')
    // cy.visit('http://localhost:4020/dg?url=http://codap-server.concord.org/~eireland/3TableGroups.json')
    // cy.visit('https://codap.concord.org/releases/staging/')
    // cy.wait(3000)
    // cfm.openDocFromModal();
    // cy.wait(500)
    // cfm.openLocalDoc(dir+filename+ext);
    cy.wait(5000)
    codap.getTableTile().click() //bring the table into focus
}) 

context('case card version', ()=>{
    describe('case card ui', ()=>{
        it('verify table icon is visible when component is in case card mode', ()=>{

        })
        it('verify case card tool palette is visible', ()=>{ //currently have to click away and click back to show tool palette

        })
        it('verify navigation button is visible in each collection', ()=>{

        })
        it('verify collection names are visible', ()=>{

        })
        it('verify add attribute icon is visible in each collection', ()=>{

        })
    })
    describe('case card functionality', ()=>{

    })
    describe('case card tool palette functionality', ()=>{

    })
    describe('attribute menu functionality',()=>{
        it('verify add attribute in child collection',()=>{

        })
        it('verify add attribute in parent collection',()=>{

        })
        it('verify edit attribute properties', ()=>{ //also verify that attribute description appears on hover

        })
        it('verify edit formula', ()=>{ //also verify that formula appears on hover, and color of case item

        })
        it('verify delete formula',()=>{//also verify that formula is not visible on hover

        })
        it('create random() formula', ()=>{

        })
        it('verify delete attribute',()=>{

        })
    })
})