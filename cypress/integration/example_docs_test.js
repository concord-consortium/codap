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

function verifyComponentExists(tiles) {
    let tableNum = tiles.table;
    let graphNum = tiles.graph;
    let mapNum = tiles.map;
    let guideNum = tiles.guide;
    let webviewNum = tiles.webview;
    let pluginNum = tiles.plugin;

    if (tableNum>0){
        tableTile.getCaseTableTile().should('be.visible').and('have.length', tableNum)
    }
    if (graphNum>0){
        graphTile.getGraphTile().should('be.visible').and('have.length', graphNum)
    }
    if (mapNum>0){
        mapTile.getMapTile().should('be.visible').and('have.length', mapNum)
    }
    if (guideNum>0){
        webviewTile.getGuideTile().should('be.visible').and('have.length', guideNum)
    }
    if (webviewNum>0){
        webviewTile.getWebviewTile().should('be.visible').and('have.length', webviewNum)
    }
    if (pluginNum>0){
        pluginTile.getPlugin().should('be.visible').and('have.length', pluginNum)
    }
}

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
                verifyComponentExists(exampleDocsData.examples[i].tiles)
                // cy.matchImageSnapshot(examples[i].document)
            }
        })
    })

})
