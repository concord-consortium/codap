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

context.only('load example doc',()=>{
    before(()=>{
        cy.visit(baseUrl+'#file=examples:Parachute%20Model');
    })
    it('open table and graph',()=>{
        codap.openTile('graph')
    })
    it('run parachute model',()=>{
        cy.getPluginIframe().find('button.start').click()
    })
})

context('plugins',()=>{
    before(()=> {
        var filename='WeatherX-doc',
            dir='../fixtures/';
    
        cy.viewport(1400,1000);
        cy.visit(baseUrl)
        cy.wait(5000)
    
        cfm.openDocFromModal();
        cy.wait(500)
        cfm.openLocalDoc(dir+filename+ext)
        // codap.getTableTileTitle().click() //bring the table into focus
    })

    describe('math formulas',()=>{
        it('verify absolute value',()=>{
            // table.getCell
        })
    })
})