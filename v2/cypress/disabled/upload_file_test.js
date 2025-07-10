//WIP - not working because of encoding

import CfmObject from "../support/elements/CfmObject";

const cfm = new CfmObject
before(()=> {
    cy.viewport(1400,1000);
    cy.visit('https://codap.concord.org/releases/staging/')
    // cy.visit('https://codap.concord.org/releases/staging/?url=https://codap.concord.org/~eireland/3TableGroups.json')
    // cy.visit('http://localhost:4020/dg?url=http://codap-server.concord.org/~eireland/3TableGroups.json')
    cy.wait(3000)
})
describe("upload the file", ()=>{
    it.only('will upload a file from the cypress/fixtures folder',()=>{
        var filename='3TableGroups.codap',
            ext = '.json',
            encoding = 'utf8';
    
    // cfm.saveToLocalDrive(filename);
    // cy.wait(500);
    //restore
    cfm.openDocFromModal();
    cy.wait(500)
    cfm.openLocalDoc(filename);
    cy.wait(5000)
    })

    it.skip('will upload a file from the Download folder',()=>{
        const dir = '../../../../Downloads/'

        var filename='blank_table',
            ext = '.codap',
            encoding = 'utf8';
        Cypress.config('fixturesFolder',dir)

    // cfm.saveToLocalDrive(filename);
    // cy.wait(500);

    //restore
    cfm.openDocFromModal();
    cy.wait(500)
    cfm.openLocalDoc(dir+filename+ext);
    cy.wait(5000)
    })
})