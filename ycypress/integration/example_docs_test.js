import CfmObject from "../support/elements/CfmObject";
import TableTileObject from "../support/elements/TableTile";
import GraphTile from "../support/elements/GraphTile";
import MapTile from "../support/elements/MapTile";
import Plugin from "../support/elements/PluginObject";
import WebviewTile from "../support/elements/WebViewObject";

//This will open the example documents from the CFM menu

const cfm = new CfmObject;
const tableTile = new TableTileObject;
const graphTile = new GraphTile;
const mapTile = new MapTile;
const pluginTile = new Plugin;
const webviewTile = new WebviewTile;


const CODAP_URL = "https://codap.concord.org/releases/staging/";
const queryParam = "#file=examples:";

before(()=> {
    cy.viewport(1400,1000);
    cy.visit(CODAP_URL)
    // cy.visit('http://localhost:4020/dg?url=http://codap-server.concord.org/~eireland/3TableGroups.json')
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
