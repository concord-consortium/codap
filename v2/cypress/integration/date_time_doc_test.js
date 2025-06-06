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
        var filename='date-time-test',
            dir='../fixtures/';
    
        cy.visit(baseUrl)
        cy.wait(5000)
    
        cfm.openDocFromModal();
        cy.wait(500)
        cfm.openLocalDoc(dir+filename+ext)
        codap.getTableTileTitle().click() //bring the table into focus
    })

    describe('date graphs',()=>{
        it('verify date axes comes up correctly',()=>{
            cy.matchImageSnapshot();
        })
    })
    describe('date formulas',()=>{
        it('verify day of week',()=>{
            table.getCell("3","3",0).should('contain',"Tuesday")
        });
        it('verify month',()=>{
            table.getCell("4","4",0).should('contain',"December")
        });
        it('verify day',()=>{
            table.getCell("5","5",0).should('contain',"6")
        });
        it('verify year',()=>{
            table.getCell("6","6",0).should('contain',"1932")
        });
        it('verify hours',()=>{
            table.getCell("7","7",0).should('contain',"9")
        });
        it('verify minutes',()=>{
            table.getCell("8","8",0).should('contain',"34")
        });
        it('verify day of week num',()=>{
            table.getCell("9","9",0).should('contain',"3")
        });
        it('verify duration',()=>{ //(((today()-date)/3600)/24)/365.25
            table.getCell("10","10",0).should('not.equal',"0").and('not.equal','')
        });
    })
})