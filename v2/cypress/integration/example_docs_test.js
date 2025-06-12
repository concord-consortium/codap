import CfmObject from "../support/elements/CfmObject";

//This will open the example documents from the CFM menu

const cfm = new CfmObject;
const CODAP_URL = "https://codap.concord.org/releases/staging/";

before(()=> {
    cy.visit(CODAP_URL)
    cy.wait(5000)
    cfm.openDocFromModal();
    cy.wait(2000)
})  

beforeEach(()=>{
    cy.fixture("example_docs_contents.json").as("exampleDocsData")
})
context('Load all Sample documents in the CODAP example tab', ()=>{
    it('will load example doc in staging and take a screenshot', ()=>{
        var i=0;
        
        cy.get("@exampleDocsData").then((exampleDocsData)=>{
            // let examples = exampleDocsData;
            let i=0;
            for (i=0; i<exampleDocsData.examples.length;i++) {
                if(i>0){
                    cfm.openDocFromFileMenu();
                    // cfm.closeConfirmDialogMessage();
                    if ((exampleDocsData.examples[i-1].document=='Markov Game')) {
                        cfm.closeConfirmDialogMessage();
                    }
                    // if (examples[i-1].document!=='Getting started with CODAP')  {
                    //     cfm.closeConfirmDialogMessage();
                    // }
                }
                cfm.openExampleDoc(exampleDocsData.examples[i].document);
                cy.wait(5000);
                cy.verifyComponentExists(exampleDocsData.examples[i].tiles)
                // cy.matchImageSnapshot(examples[i].document)
            }
        })
    })

})
