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

context('math formulas',()=>{
    before(()=> {
        var filename='math-formula-test',
            dir='../fixtures/';
    
        cy.visit(baseUrl)
        cy.wait(5000)
    
        cfm.openDocFromModal();
        cy.wait(500)
        cfm.openLocalDoc(dir+filename+ext)
        codap.getTableTileTitle().click() //bring the table into focus
    })

    describe.skip('math formulas',()=>{
        it('verify absolute value',()=>{
            table.getCell
        })
    })
})