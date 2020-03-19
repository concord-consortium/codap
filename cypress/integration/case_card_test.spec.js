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

before(()=> {
    var filename='TableC',
        dir='../fixtures/';

    cy.viewport(1400,1000);
    cy.visit(baseUrl)
    cy.wait(5000)

    cfm.openDocFromModal();
    cy.wait(500)
    cfm.openLocalDoc(dir+filename+ext)
    // codap.getTableTile().click() //bring the table into focus
    table.changeToCaseCard();
}) 

context('case card version', ()=>{
    describe('case card ui', ()=>{
        it('verify table icon is visible when component is in case card mode', ()=>{
            table.getTableIcon().should('be.visible');
        })
        it('verify case card tool palette is visible', ()=>{ 
            table.getTableToolPalette().should('be.visible');
        })
        it('verify navigation button is visible', ()=>{
            table.getCaseCardNavBackIcon().should('be.visible');
            table.getCaseCardNavForwardIcon().should('be.visible');
        })
        it('verify collection info is visible', ()=>{
            table.getCaseCardCollectionHeader().should('be.visible').and('contain','179 cases');
        })
        it('verify add attribute icon is visible', ()=>{
            table.getCaseCardAddAttributePlusIcon().should('be.visible');
        })
        it('verify add case plus icon is visible',()=>{
            table.getCaseCardAddCasePlusIcon().should('be.visible');
        })
        it('verify attribute summaries is displayed',()=>{
            table.getCaseCardAttributeSummary().should('be.visible').and('have.length',4)
        })
    })
    describe('case card functionality', ()=>{
        it('verify navigation with nav arrows',()=>{
            let data1="dog", data2="rabbit";
            table.getCaseCardNavForwardIcon().click();
            table.getCaseCardAttributeSummary().should('not.exist')
            table.getCaseCardCollectionHeader().should('contain','1 selected of 179 cases');
            table.getCaseCardCell().first().should('contain',data1)
            table.getCaseCardNavForwardIcon().click();
            table.getCaseCardCell().first().should('contain',data2)
            table.getCaseCardNavBackIcon().click();
            table.getCaseCardCell().first().should('contain',data1)
        })
        it('verify add case',()=>{
            let data=["hamster","Sun","52","13"]
            table.getCaseCardAddCasePlusIcon().click();
            table.getCaseCardCollectionHeader().should('contain','1 selected of 180 cases');
            table.getCaseCardAttribute().contains('CCAT1').should('be.visible');
            table.getCaseCardCell({multiple:true}).should('contain','____');
            table.getCaseCardCell().each((cell,index,cell_list)=>{
                cy.wrap(cell).click()
                table.editCaseCardCell(data[index])
            })
            table.getCaseCardCell().first().should('contain',data[0])
        })
        it('verify add attribute',()=>{
            let attr='newAttr';
            table.getCaseCardAddAttributePlusIcon().click();
            cy.get(table.caseCardAttributeInputEl()).type('{enter}')
            table.getCaseCardAttribute().contains(attr).should('be.visible');
        })
        it.skip('verify reorder of attribute',()=>{ //drag and drop of attribute not working
            let attr='newAttr';
            cy.dragAttributeToTarget('card',attr,'card',3)
        })
        it.skip('verify create new parent collection',()=>{ //drag and drop of attribute not working
            let attr='CCAT1'
            cy.dragAttributeToTarget('card',attr,'card collection')
        })

    })
    describe('attribute menu functionality',()=>{
        before(()=> {
            var filename='3TableGroups',
                dir='../fixtures/';
        
            cy.viewport(1400,1000);
            cy.visit(baseUrl)
            cy.wait(5000)
        
            cfm.openDocFromModal();
            cy.wait(500)
            cfm.openLocalDoc(dir+filename+ext)
            codap.getTableTileTitle().click() //bring the table into focus
            table.changeToCaseCard();
        }) 
        it('verify add attribute in child collection',()=>{
            let attr='newAttr';
            table.getCaseCardAddAttributePlusIcon().eq(2).click();
            table.getCaseCardCollectionHeader(2).siblings('.react-data-card-row').find(table.caseCardAttributeInputEl()).type('{enter}')
            table.getCaseCardCollectionHeader(2).siblings('.react-data-card-row').find(table.caseCardAttributeEl()).contains(attr).should('be.visible');
        })
        it('verify add attribute in parent collection',()=>{
            let attr='newAttr2';
            table.getCaseCardAddAttributePlusIcon().eq(0).click();
            table.getCaseCardCollectionHeader(0).siblings('.react-data-card-row').find(table.caseCardAttributeInputEl()).type('{enter}')
            table.getCaseCardCollectionHeader(0).siblings('.react-data-card-row').find(table.caseCardAttributeEl()).contains(attr).should('be.visible');

        })
        it('verify edit attribute properties', ()=>{ //also verify that attribute description appears on hover
            let attr='newAttr', new_attr="CCAT3";
            table.editAttributeProperty("case card", attr, new_attr) //function not working
        })
        it('verify edit formula', ()=>{ //also verify that formula appears on hover, and color of case item

        })
        it('verify delete formula',()=>{//also verify that formula is not visible on hover

        })

        it('verify delete attribute',()=>{
            let attr='newAttr';
            table.getCaseCardAttribute().contains(attr).click();
            table.getCaseCardAttributeMenuItem('Delete Attribute').click();
            table.getCaseCardAttribute().contains(attr).should('not.exist')
        })
    })
    describe('case card tool palette functionality', ()=>{

    })
})