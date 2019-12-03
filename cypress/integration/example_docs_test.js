import CfmObject from "../support/elements/CfmObject";

//This will open the example documents from the CFM menu

const cfm = new CfmObject;

const CODAP_URL = "https://codap.concord.org/releases/staging/";
const queryParam = "#file=examples:";
const max_attempts = 10;

before(()=> {
    cy.viewport(1400,1000);
    cy.visit(CODAP_URL)
    // cy.visit('http://localhost:4020/dg?url=http://codap-server.concord.org/~eireland/3TableGroups.json')
    cy.wait(5000)
    cfm.openDocFromModal();
    cy.wait(2000)
})  
context('Load all Sample documents in the CODAP example tab', ()=>{
    it('will load example doc in staging and take a screenshot', ()=>{
        var listingArray = ['Four Seals', 'Getting started with CODAP', 'Mammals', 'Map Data', 'Markov Game', 'Parachute Model', 'Roller Coasters'];
        var i=0;

        for (i=0; i<listingArray.length;i++) {
            if(i>0){
                cfm.openDocFromFileMenu();
                if (listingArray[i-1]=='Markov Game') {
                    cfm.closeConfirmDialogMessage();
                }
            }
            cfm.openExampleDoc(listingArray[i]);
            cy.wait(5000);
            cy.matchImageSnapshot(listingArray[i])
        }
    })

})
