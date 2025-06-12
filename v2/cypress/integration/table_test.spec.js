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

    cy.visit(baseUrl)
    cy.wait(5000)

    cfm.openDocFromModal();
    cy.wait(500)
    cfm.openLocalDoc(dir+filename+ext)
    codap.getTableTileTitle().click().type('{enter}') //bring the table into focus
})

context('table ui',()=>{ //tests for ui elements
    describe('table components', ()=>{//component title, minimize and close are tested in codap general tests
        it('verify table tool palette is visible on component focus',()=>{
            table.getTableToolPalette().should('be.visible');
            table.getRescaleTable().should('be.visible')
            table.getTrashIconMenu().should('be.visible')
            table.getOpenEyeIconMenu().should('be.visible')
            table.getRulerIconMenu().should('be.visible')
        })
        it('verify case card icon is visible when component is a table', ()=>{
            table.getCaseCardIcon().should('be.visible')
        })
    })
    describe('table view', ()=>{
        const collectionName = 'cases (179 cases)';
        it('verify collection name is visible', ()=>{
            table.getCollectionTitle().should('have.length', 1);
            table.getCollectionByName(collectionName).should('be.visible')
        })
        it('verify columns are visible',()=>{
            table.getColumnHeader().should('have.length',5)
        })
        it('verify add attribute icon is visible for every collection on table focus', ()=>{
            table.getAddNewAttributePlusIcon(collectionName).should('be.visible')
        })
        it('verify collection creation dropzones are visible', ()=>{
            //TODO: need to think about this
        })

        it('verify description and formula is visible on hover', ()=>{
            //TODO: need to think about this
        })
        it('verify index menu is visible when index column is clicked', ()=>{ //openIndexMenu has an array of all the index menu not by collection
            table.openIndexMenu(25);
            table.getIndexMenu().should('be.visible');
            cy.clickMenuItem('Insert Case');     //dismisses index menu
            cy.wait(500);
            codap.undo(); //undo the insert case that dismissed the index menu
            cy.wait(500);
        })
    })
})

context('table tile component functionality', ()=>{ //tests for general table component functionality
    it('verify table switches to case card when case card icon is clicked', ()=>{
        table.changeToCaseCard();
        casecard.getCaseCardTile().should('be.visible');
    })
    it('verify case card switches to table when table icon is clicked', ()=>{
        casecard.changeToTable();
        table.getCaseTableTile().should('be.visible')
        cy.wait(2000);
    })
    //TODO: can't get the close icon to be visible
    it('verify table closes when close icon is clicked',()=>{
        codap.closeTile('table','TableC');
        cy.wait(2000);
        codap.getTableTile().should('not.be.visible');
    })
    it('verify table re-opens with correct data when table title is selected from table menu', ()=>{
        codap.openTile('table','TableC');
        codap.getTableTile().should('be.visible');
        table.getCaseCardIcon().should('be.visible');
        // table.getAddNewAttributePlusIcon('TableC').should('be.visible');
        table.getCollection().should('exist').and('have.length', 1);
        table.getCollectionTitle().contains('179 cases').should('exist')
        table.getIndex().should('have.length', 61)
    })
})

context('table view functionality', ()=>{ //tests for table view/slick grid elements
  describe('reorder attribute',()=>{ //TODO: need to figure out how to verify order of columns
    before(()=>{
      cy.resizeTile(0);
    })
    it('verify attribute reorder within a collection',()=>{
        cy.dragAttributeToTarget('table','CNUM1', 'table',2)
        table.getAttributeHeader().eq(2).should('contain','CNUM1')
    })
    it('verify attribute create new leftmost collection',()=>{
        var collectionName='CCAT1S'
        cy.dragAttributeToTarget('table','CCAT1', 'newCollection')
        table.getCollectionTitle().should('have.length', 2);
        table.getCollectionByName(collectionName).should('be.visible')
    })
    it('verify create new collection between collections',()=>{
        var collectionName="CCAT2S"
        cy.dragAttributeToTarget('table','CCAT2', 'newCollection', 1)
        table.getCollectionTitle().should('have.length', 3);
        table.getCollectionByName(collectionName).should('be.visible')
    })
    it('verify remove of middle collection',()=>{
        var collectionName="CCAT2S"
        cy.dragAttributeToTarget('table','CCAT2', 'table',6)
        table.getCollectionTitle().should('have.length', 2);
        table.getCollectionByName(collectionName).should('not.exist')
    })
    it('verify remove of leftmost collection',()=>{
        var collectionName="CCAT1S"
        cy.dragAttributeToTarget('table','CCAT1', 'table',3)
        table.getCollectionTitle().should('have.length', 1);
        table.getCollectionByName(collectionName).should('not.exist')
    })
  })

  describe('table header attribute menu', ()=>{
        let name = 'formAttr'
        it('verify add attribute',()=>{
            table.addNewAttribute('cases');
            table.getColumnHeader().should('have.length',6);
            table.getAttribute('CNUM1').should('exist');
            table.getAttribute('CNUM1').click();
            table.getAttribute('newAttr').should('exist');
        })
        it('verify edit attribute properties', ()=>{ //also verify that attribute description appears on hover
            let description = 'This should have a formula', type = null, unit=null, precision = null, editable = null;
            // table.editAttributeProperty('newAttr', name, description, type, unit, precision, editable)
            table.openAttributeMenu('newAttr');
            table.selectMenuItemFromAttributeMenu('Edit Attribute Properties...');
            table.enterAttributeName('{selectAll}{backspace}'+name);
            table.getApplyButton().click();
            table.getAttribute(name).should('exist');
            // TODO need to figure out the mouse event for the hover
            // table.getAttribute(name)
            //     .trigger('mouseover');
            // table.getAttribute(name).should('have.attr','title').and('contain',description)
        })
        it('verify edit formula', ()=>{ //also verify that formula appears on hover, and column changes color
            let formula = ('CNUM1*CNUM2');
            table.editFormula(name, formula);
            cy.get('.dg-formula-column .dg-numeric').eq(0).should('contain',406);
        })
        it('verify hover over attribute shows description and formula',()=>{ //not sure what the text should be
            //current behavior is it only shows description

        })
        it('verify delete formula and keep value',()=>{//also verify that formula is not visible on hover
            table.openAttributeMenu(name)
            table.selectMenuItemFromAttributeMenu('Delete Formula (Keeping Values)')
            cy.get('.dg-numeric').eq(2).should('contain',406);
        })
        it('verify sort ascending', ()=>{
            table.openAttributeMenu(name)
            table.selectMenuItemFromAttributeMenu('Sort Ascending (A→Z, 0→9)')
            cy.get('.dg-numeric').eq(2).should('contain',51);
        })
        it('verify sort descending', ()=>{
            table.openAttributeMenu(name)
            table.selectMenuItemFromAttributeMenu('Sort Descending (9→0, Z→A)')
            cy.get('.dg-numeric').eq(2).should('contain',1425);
        })
        it('create random() formula, and rerandomize', ()=>{
            var formula="random()", name='newAttr'
            table.addNewAttribute('cases');
            table.getAttribute('CNUM1').click();
            table.editFormula(name, formula);
            cy.get('.dg-formula-column .dg-numeric').eq(0).should('be.visible');
            cy.get('.dg-formula-column .dg-numeric').eq(0).then(($span)=>{
                let num=($span.text())
                table.openAttributeMenu(name);
                table.getAttributeMenuItem('Rerandomize').should('exist');
                table.selectMenuItemFromAttributeMenu('Rerandomize');
                cy.get('.dg-formula-column .dg-numeric').eq(0).text().should('not.eq', num)
            })
        })
        it('verify delete attribute',()=>{
            table.openAttributeMenu('newAttr')
            table.selectMenuItemFromAttributeMenu('Delete Attribute')
            table.getAttribute('CNUM1').click();
            table.getColumnHeader().should('have.length',6);
        })
    })


    describe('index menu',()=>{
       it('verify index column cannot be reordered',()=>{

       })
       it('verify insert 1 case at the bottom',()=>{

       })
       it('verify insert multiple cases below current case at the bottom',()=>{

       })
       it('verify insert multiple cases above current case at the bottom', ()=>{

       })
       it('verify delete last case', ()=>{

       })
       it('verify insert 1 case at the top',()=>{

        })
        it('verify insert multiple cases below current case at the top',()=>{

        })
        it('verify insert multiple cases above current case at the top', ()=>{

        })
        it('verify delete first case', ()=>{

        })
        it('verify insert 1 case in the middle',()=>{

        })
        it('verify insert multiple cases below current case in the middle',()=>{

        })
        it('verify insert multiple cases above current case in the middle', ()=>{

        })
        it('verify delete case in the middle', ()=>{

        })
    })
})
context('table tool palette', ()=>{ //tests for tool palette elements
    //not sure how to test the column rescale function, and delete cases
    it('verify select all', ()=>{

    })
    it('verirfy select some', ()=>{

    })
    it('verify delete unselected', ()=>{

    })
    it('verify delete selected', ()=>{

    })
    it('verify delete all', ()=>{

    })
})
context('Multiple collections',function(){
    before(()=> {
        var filename='3TableGroups',
            dir='../fixtures/';

        cfm.closeDocFromFileMenu();
        cfm.closeConfirmDialogMessage();
        cfm.openDocFromFileMenu();
        cy.wait(500)
        cfm.openLocalDoc(dir+filename+ext)
        codap.getTableTileTitle().click() //bring the table into focus
    })
    describe('table UI', ()=>{
        it('verify collection name is visible', ()=>{
            table.getCollectionTitle().should('have.length', 3);
            table.getCollectionByName('Table A').should('be.visible')
            table.getCollectionByName('Table B').should('be.visible')
            table.getCollectionByName('Table C').should('be.visible')
        })
        it('verify add attribute icon is visible for every collection on table focus', ()=>{
            table.getAddNewAttributePlusIcon('Table A').should('be.visible')
            table.getAddNewAttributePlusIcon('Table B').should('be.visible')
            table.getAddNewAttributePlusIcon('Table C').should('be.visible')
        })
        it('verify expand/collapse icon is visible when there is more than one collection', ()=>{
            table.getCollapseIcon().should('have.attr', 'href').and('include', 'collapse.gif')
            table.getCollapseAllIcon().first().click({force:true});
            table.getExpandIcon().should('have.attr','href').and('include', 'expand.gif')
            // table.getExpandIcon().should('have.attr','href').and('include', 'no-action.png')//if parent is collapsed, child expanse/collapase should not be showing
            table.getExpandAllIcon().first().click({force:true});
            table.getCollapseIcon().should('have.attr', 'href').and('include', 'collapse.gif')
            table.getCollapseAllIcon().last().click({force:true});
            table.getCollapseIcon().should('have.attr', 'href').and('include', 'collapse.gif') //parent should still be collapsible
            // table.getExpandIcon().should('have.attr','href').and('include', 'expand.gif') //child should be collapsed
            table.getExpandAllIcon().last().click({force:true}); //expand child again
        })
    })
    describe('expand and collapse collection',()=>{ //need to create a three level table
        it('verify collapse child collection',()=>{
            table.getCollapseAllIcon().last().click()
            cy.get('.dg-collapsed-row').should('have.length',44)
        })
        it('verify collapse middle collection',()=>{
            table.getCollapseAllIcon().first().click()
            cy.get('.dg-collapsed-row').should('have.length',38)
        })
        it('verify expand middle collection',()=>{
            table.getExpandAllIcon().first().click()
            cy.get('.dg-collapsed-row').should('have.length',44)
        })
        it('verify expand child collection',()=>{
            table.getExpandAllIcon().last().click()
            cy.get('.dg-collapsed-row').should('have.length',0)
        })
        it('verify collapse middle collection collapses child collection automatically',()=>{
            table.getCollapseAllIcon().first().click()
            cy.get('.dg-collapsed-row').should('have.length',38)
        })
        it('verify reorder attributes while collection is collapsed',()=>{
            cy.dragAttributeToTarget('table','CCAT1', 'table',2)
            table.getAttributeHeader().eq(2).should('contain','CCAT1')
        })
        it('verify create new collection while collecction is collapsed',()=>{
            var collectionName="CCAT1S"
            cy.dragAttributeToTarget('table','CCAT1', 'newCollection', 2)
            table.getCollectionTitle().should('have.length', 4);
            table.getCollectionByName(collectionName).should('be.visible')
        })
        it('verify expand middle collection expands child collection automatically',()=>{
            table.getExpandAllIcon().first().click()
            cy.get('.dg-collapsed-row').should('have.length',0)
        })
    })

})
