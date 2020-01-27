import GraphTile from "../support/elements/GraphTile"
import TableTile from "../support/elements/TableTile"
import CodapObject from "../support/elements/CodapObject";
import CfmObject from "../support/elements/CfmObject";

const graph = new GraphTile
const table = new TableTile
const codap = new CodapObject
const cfm = new CfmObject;

const filename='3TableGroups',
      ext = '.json';

const arrayOfPlots = [  {attribute:'ACAT1', axis:'x1', collection:'Table A'},
                        {attribute:'ACAT2', axis:'y1', collection:'Table A'},
                        {attribute:'ANUM1', axis:'x', collection:'Table A'},
                        {attribute:'ANUM2', axis:'y', collection:'Table A'},
                        {attribute:'BCAT1', axis:'x', collection:'Table B'},
                        {attribute:'BNUM1', axis:'x', collection:'Table B'},
                        {attribute:'CCAT1', axis:'x', collection:'Table C'},
                        {attribute:'CNUM1', axis:'x', collection:'Table C'},
                        {attribute:'BNUM1', axis:'y', collection:'Table B'},
                        {attribute:'CCAT2', axis:'x', collection:'Table C'},
                        {attribute:'BCAT1', axis:'y', collection:'Table B'},
                        {attribute:'ACAT2', axis:'y', collection:'Table A'},
                        {attribute:'ACAT1', axis:'graph_legend1', collection:'Table A'},
                        {attribute:'CNUM1', axis:'y', collection:'Table C'},
                        {attribute:'BNUM1', axis:'x', collection:'Table B'},
                        {attribute:'ANUM1', axis:'graph_legend', collection:'Table A'},
                        {attribute:'BCAT1', axis:'x', collection:'Table B'},
                        {attribute:'CCAT2', axis:'y', collection:'Table C'},]

const baseUrl = `${Cypress.config("baseUrl")}`;

context('Test Graph Plot Transitions', ()=>{
    before(function(){
        cy.viewport(1400,1000);
        cy.visit(baseUrl+'?url=https://codap.concord.org/~eireland/3TableGroups.json')
        // cy.visit('http://localhost:4020/dg?url=http://codap-server.concord.org/~eireland/3TableGroups.json')
        // cy.visit('https://codap.concord.org/releases/staging/')
        // cy.wait(3000)
        // cfm.openDocFromModal();
        // cy.wait(500)
        // cfm.openLocalDoc(filename+ext);
        cy.wait(5000)
    }) 
    it('will add attributes to a graph and verify plot transitions are correct', ()=>{
        codap.openTile('graph')
        cy.wait(3000);
        arrayOfPlots.forEach((hash)=>{
            graph.changeAxisAttribute(hash)
            cy.wait(4000);
            cy.matchImageSnapshot(hash.attribute+'_on_'+hash.axis)
        })
    })
})

//TODO: Need to add side by side transitions and right vertical axis