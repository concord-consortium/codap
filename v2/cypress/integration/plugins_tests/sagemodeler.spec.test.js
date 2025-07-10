import CodapObject from "../../support/elements/CodapObject";
import GraphTile from "../../support/elements/GraphTile";
import CaseCardTile from "../../support/elements/CaseCardObject";
import TextTile from "../../support/elements/TextObject";
import Sage from "../../support/plugin_elements/sage/SagePluginObject"
import { getIframeBody } from "../../support/commands"

const codap = new CodapObject;
const graph = new GraphTile;
const casecard = new CaseCardTile;
const text = new TextTile;
const sage = new Sage;

const url = "https://sagemodeler.concord.org/releases/staging/static/dg/en/cert/?codap=staging&embeddedMode=yes&hideSplashScreen=yes&hideUndoRedoInComponent=yes&hideWebViewLoading=yes&lang-override=en&standalone=SageModeler&di=/sage/sagemodeler.html%3Fstandalone%3Dtrue&di-override=sage"

context(('Sagemodeler with CODAP'), () => {
  before(() => {
    cy.visit(url);
    sage.addNode(200,400, "node 1");
    sage.addNode(400,400, "node 2");
    sage.addRelationship();
    sage.getAddedNode("Node-2").click();
    sage.getRelationshipTool().click();
    sage.selectRelationship("increase");
    sage.selectRelationshipRate("moreAndMore");
    sage.runSimulation();
    sage.moveNodeSlider("Node-1", -1);
    sage.moveNodeSlider("Node-1", 15);
    sage.moveNodeSlider("Node-1", -20);
  })
  describe('CODAP components opens', () => {
    it('new table opens',()=>{
      sage.getToolbarButton("Tables").click();
      sage.openNewTableTile();
      codap.getTableTile().should('be.visible');
    })
    it('graph opens',()=>{
      sage.getToolbarButton("Graph").click();
      graph.getGraphTile().should('be.visible');
      codap.closeTile("graph", "Data points"); //close it to make later test easier
    })
    it('text opens',()=>{
      sage.getToolbarButton("Text").click();
      text.getTextTile().should('be.visible');
    })
    it('SageModeler table opens',()=>{
      const title = "SageModeler Data"
      sage.getToolbarButton("Tables").click();
      sage.openSageTableTile(title);
      codap.getTableTile().should('be.visible');
      codap.getTableTileTitle().eq(0).should('contain', title);
    })
    it('verify Sage data is seen in CODAP table',()=>{
      table.getCell("3","3", 2).should("exist");
    })
    it('verify node graph button opens a graph',()=>{
      sage.getNodeGraphButton("Node-2").click();
      graph.getGraphTile().should("be.visible");
      graph.getHorizontalAxisLabel().should("contain","Data point");
      graph.getLeftVerticalAxisLabel().should("contain","node 2");
    })
    it('verify Sage data is seen in CODAP graph',()=>{
      graph.getDataDot().should('be.visible').and('have.length',3);
    })
  })
})

context.only('Sagemodeler document opens',()=>{
  before(()=>{
    cy.visit('https://sagemodeler.concord.org/app/?codap=staging#shared=https://cfm-shared.concord.org/gRFYONX8GmYg9SJ4266K/file.json');
  })
  describe('Sagemodeler shared document opens',()=>{
    it('verify Sagemodeler shared document opens',()=>{
      getIframeBody('#app .innerApp iframe').within(()=>{
        cy.wait(3000);
        cy.getSageIframe().find('.node-container').should('be.visible').and('have.length', 11);
        cy.getSageIframe().find(sage.relationshipArrow()).should('be.visible').and('have.length', 12);
        codap.getTableTile().should('be.visible')
        graph.getGraphTile().should('be.visible').and('have.length', 2);
      })
    })
  })
})
