import TableTile from "../support/elements/TableTile";
import CodapObject from "../support/elements/CodapObject";
import CaseCardObject from "../support/elements/CaseCardObject";
import CfmObject from "../support/elements/CfmObject";

const table = new TableTile;
const codap = new CodapObject;
const cfm = new CfmObject;
const casecard = new CaseCardObject;

const dir = '../downloads/';
const ext = '.codap';
const baseUrl = `${Cypress.config("baseUrl")}`;

before(()=> {
    cy.visit(baseUrl)
    cy.wait(5000)
})

context('CFM functionalities with table', ()=>{

    it('verify save and restore of blank table', ()=>{ //test to see if a blank table is saved properly.
        var filename='blank_table'
        cfm.createNewDocument();
        codap.openTile('table','-- new --');
        table.getCaseTableTile().should('be.visible')
        cy.wait(5000);
        cfm.saveToLocalDrive(filename);
        cy.wait(500);
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        //restore
        cfm.openDocFromModal();
        cy.wait(500)
        cfm.openLocalDoc(dir+filename+ext);
        table.getCaseTableTile().should('be.visible')
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        // cfm.closeConfirmDialogMessage();
    })
    it('verify save and restore of closed blank table', ()=>{ //bug found by Dan
        var filename='closed_table';
        // cfm.createNewDocument();
        codap.openTile('table','-- new --');
        table.getCaseTableTile().should('be.visible');
        table.getCollection().click();
        codap.closeTile('table','New Dataset');
        cy.wait(5000);
        cfm.saveToLocalDrive(filename);
        cy.wait(500);
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        //restore
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Open')
        cfm.openLocalDoc(dir+filename+ext);
        codap.openTile('table','New Dataset')
        table.getCaseTableTile().should('be.visible')
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        // cfm.closeConfirmDialogMessage();
    })
    it('verify save and restore of non-blank table', ()=>{
        var filename='nonblank_table';
        // cfm.createNewDocument();
        codap.openTile('table','-- new --');
        table.getCaseTableTile().should('be.visible');
        table.getCollection().click();
        // TODO: add some cases to the table
        cy.wait(5000);
        cfm.saveToLocalDrive(filename);
        cy.wait(500);
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        //restore
        // cfm.openDocFromModal();
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Open')
        cfm.openLocalDoc(dir+filename+ext);
        codap.openTile('table','New Dataset')
        table.getCaseTableTile().should('be.visible')
        //TODO: verify cell contents are there
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        // cfm.closeConfirmDialogMessage();
    })
    it('verify save and restore of minimized table', ()=>{
        var filename='min_table';
        // cfm.createNewDocument();
        codap.openTile('table','-- new --');
        table.getCaseTableTile().should('be.visible');
        table.getCollection().click();
        codap.minimizeTile();
        cy.wait(5000);
        cfm.saveToLocalDrive(filename);
        cy.wait(500);
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        //restore
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Open')
        cfm.openLocalDoc(dir+filename+ext);
        codap.openTile('table','New Dataset')
        table.getCaseTableTile().should('be.visible')
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        // cfm.closeConfirmDialogMessage();
    })
    it('verify save and restore of closed non-blank table', ()=>{
        var filename='closed nonblank table';
        // cfm.createNewDocument();
        codap.openTile('table','-- new --');
        table.getCaseTableTile().should('be.visible');
        table.getCollection().click();
        // TODO: add data to table
        codap.closeTile('table', 'New Data');
        cy.wait(5000);
        cfm.saveToLocalDrive(filename);
        cy.wait(500);
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        //restore
        // cfm.openDocFromModal();
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Open')
        cfm.openLocalDoc(dir+filename+ext);
        codap.openTile('table','New Dataset')
        table.getCaseTableTile().should('be.visible')
        // TODO: need to verify cell contents
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Close');
        // cfm.closeConfirmDialogMessage();
    })
})