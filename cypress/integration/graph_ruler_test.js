import CfmObject from '../support/elements/CfmObject'
import GraphTile from '../support/elements/GraphTile'
import CodapObject from '../support/elements/CodapObject'

const cfm = new CfmObject;
const graph = new GraphTile;
const codap = new CodapObject;

// const codapDoc = '3TableGroups.json'

const baseUrl = `${Cypress.config("baseUrl")}`;

beforeEach(()=>{
    // cy.visit(baseUrl+"?url=https://codap.concord.org/~eireland/"+codapDoc)
    var filename = '3TableGroups',
      ext = ".codap",
      dir = '../fixtures/';

    cy.visit(baseUrl)
    cfm.openDocFromModal();
    cfm.openLocalDoc(dir + filename + ext);
    cy.wait(2000)
})

context('will test graph ruler functions', ()=>{
    it('will test num univariate plot', ()=>{
        var hash = [{attribute: 'ANUM1', axis:'x1', collection:'Table A', length:1}]
        codap.openTile('graph');
        cy.wait(2000)
        hash.forEach((hash)=>{
            cy.dragAttributeToTarget('table',hash.attribute, hash.axis)
            graph.clickRulerTool();
            graph.turnOnRulerTool('count')
            graph.getCountAdorn().should('have.length',hash.length)
            graph.turnOnRulerTool('plottedMean')
            graph.turnOnRulerTool('plottedMedian')
                graph.turnOnRulerTool('plottedStDev')
                graph.turnOnRulerTool('plottedBoxPlot')
                graph.turnOnRulerTool('plottedValue')
                graph.getMovableValueButton().click();
                cy.clickMenuItem('Add');
                cy.wait(4000)
                cy.matchImageSnapshot('n_'+hash.attribute+'_on_'+hash.axis+'_adorned');
                graph.clickRulerTool({force:true});
                cy.wait(500);
                graph.clickRulerTool({force:true});//have to click ruler twice to open panel
                graph.turnOffRulerTool('count')
                graph.getCountAdorn().should('not.be.visible')
                graph.turnOffRulerTool('plottedMean')
                graph.turnOffRulerTool('plottedMedian')
                graph.turnOffRulerTool('plottedStDev')
                graph.turnOffRulerTool('plottedBoxPlot')
                graph.turnOffRulerTool('plottedValue')
                graph.getMovableValueButton().click();
                cy.clickMenuItem('Remove');
                cy.wait(4000)
                cy.matchImageSnapshot('n_'+hash.attribute+'_on_'+hash.axis+'_unadorned');
            })
            // cy.get(".dg-graph-view").siblings('.dg-titlebar').children('.dg-titleview').contains("Table C").siblings('.dg-close-icon')
            // .click({force:true})
            // cy.wait(2000);
            // codap.closeTile('graph','Table C');
    })
    it('will test cat v cat shows count and percent', ()=>{
        var hash = [{attribute: 'ACAT1', axis:'x1', collection:'Table A', length:3},
                    {attribute:'BCAT1', axis:'y1', collection:'Table B', length:21},
                    {attribute:'CCAT2', axis:'x', collection:'Table C', length:14},
                    {attribute:'CCAT1', axis:'y', collection:'Table C', length:8}]
        codap.openTile('graph');
        cy.wait(2000)
        hash.forEach((hash)=>{
            cy.dragAttributeToTarget('table',hash.attribute, hash.axis)
            graph.clickRulerTool();
            graph.turnOnRulerTool('count')
            graph.getCountAdorn().should('have.length',hash.length)
            graph.turnOnRulerTool('percent')
            graph.getCountAdorn().should('have.length',hash.length)
            graph.turnOffRulerTool('percent')
            graph.getCountAdorn().should('have.length',hash.length) //count adorment should still be present
            graph.turnOffRulerTool('count')
            graph.getCountAdorn().should('not.be.visible')
        })
        codap.closeTile('graph','Table C');
        //TODO: need to test the different percent settings
    })

    it('will test cat v num ruler adorments', ()=>{
        var hash = [{attribute: 'ACAT1', axis:'x1', collection:'Table A', attribute2:'ANUM1', axis2:'y1', collection2:'Table A'},
                    {attribute:'BCAT1', axis:'x', collection:'Table B'},
                    {attribute:'CNUM2', axis:'y', collection:'Table C'},
                    {attribute: 'ACAT1', axis:'x', collection:'Table A'}]
        codap.openTile('graph');
        cy.wait(2000)
        hash.forEach((hash, idx)=>{
            cy.dragAttributeToTarget('table',hash.attribute, hash.axis)
            if (idx===0) {cy.dragAttributeToTarget('table',hash.attribute2, hash.axis2)}
            graph.clickRulerTool();
            graph.turnOnRulerTool('plottedMean')
            graph.turnOnRulerTool('plottedMedian')
            graph.turnOnRulerTool('plottedStDev')
            graph.turnOnRulerTool('plottedBoxPlot')
            graph.turnOnRulerTool('plottedValue')
            if (idx===0) {
                graph.getValueFormulaLabel().click();
                graph.enterFormula('55');
                graph.clickRulerTool();
            }
            graph.getMovableValueButton().click();
            cy.clickMenuItem('Add');
            cy.wait(1000)
            cy.matchImageSnapshot('c_v_n_'+hash.attribute+'_on_'+hash.axis+'_adorned');
            graph.clickRulerTool({force:true});
            cy.wait(500);
            graph.clickRulerTool({force:true});//have to click ruler twice to open panel
            graph.turnOffRulerTool('plottedMean')
            graph.turnOffRulerTool('plottedMedian')
            graph.turnOffRulerTool('plottedStDev')
            graph.turnOffRulerTool('plottedBoxPlot')
            graph.turnOffRulerTool('plottedValue')
            graph.getMovableValueButton().click();
            cy.clickMenuItem('Remove');
            cy.wait(4000)
            cy.matchImageSnapshot('c_v_n_'+hash.attribute+'_on_'+hash.axis+'_unadorned');
        })
        codap.closeTile('graph','Table C');
    })
    it('will test num v num ruler adorments', ()=>{
        var hash = [{attribute: 'ANUM1', axis:'x1', collection:'Table A', attribute2:'ANUM2', axis2:'y1', collection2:'Table A'},
                    {attribute:'BNUM1', axis:'x', collection:'Table B'},
                    {attribute:'CNUM2', axis:'y', collection:'Table C'},
                    {attribute: 'ANUM1', axis:'x', collection:'Table A'}]
        codap.openTile('graph');
        cy.wait(2000)
        hash.forEach((hash, idx)=>{
            cy.dragAttributeToTarget('table',hash.attribute, hash.axis)
            if (idx===0) {cy.dragAttributeToTarget('table',hash.attribute2, hash.axis2)}
            graph.clickRulerTool();
            //TODO: verify interceptLock and squares of residuals are disabled
            graph.turnOnRulerTool('count')
            graph.turnOnRulerTool('connectingLine')
            graph.turnOnRulerTool('movablePoint')
            graph.turnOnRulerTool('movableLine')
            graph.turnOnRulerTool('lsrl')
            graph.turnOnRulerTool('interceptLocked')
            graph.turnOnRulerTool('plottedFunction')
            if (idx===0) {
                graph.getValueFormulaLabel().click();
                graph.enterFormula('x*x/30-50');
                graph.clickRulerTool();
            }
            graph.turnOnRulerTool('plottedValue')
            if (idx===0) {
                graph.getValueFormulaLabel().click();
                graph.enterFormula('55');
                graph.clickRulerTool();
            }
            graph.turnOnRulerTool('squares')
            cy.wait(4000)
            cy.matchImageSnapshot('n_v_n_'+hash.attribute+'_on_'+hash.axis+'_adorned');
            graph.clickRulerTool({force:true});
            cy.wait(500);
            graph.clickRulerTool({force:true});//have to click ruler twice to open panel
            graph.turnOffRulerTool('count')
            graph.turnOffRulerTool('connectingLine')
            graph.turnOffRulerTool('movablePoint')
            graph.turnOffRulerTool('movableLine')
            graph.turnOffRulerTool('lsrl')
            graph.turnOffRulerTool('interceptLocked')
            graph.turnOffRulerTool('plottedFunction')
            graph.turnOffRulerTool('plottedValue')
            graph.turnOffRulerTool('squares')
            cy.wait(4000)
            cy.matchImageSnapshot('n_v_n_'+hash.attribute+'_on_'+hash.axis+'_unadorned');
        })
        codap.closeTile('graph','Table C');
    })

    context('Plot transitions with adornments',()=>{
        var hash = [{attribute: 'ANUM1', axis:'x1', collection:'Table A', length:1},
                    {attribute: 'BNUM1', axis:'x1', collection:'Table B', length:1},
                    {attribute: 'CNUM1', axis:'y1', collection:'Table C', length:1},
                    {attribute: 'BCAT1', axis:'x1', collection:'Table B', length:1},
                    {attribute: 'ACAT1', axis:'x1', collection:'Table A', length:1},
                    {attribute: 'CCAT1', axis:'y1', collection:'Table C', length:4},]

        beforeEach(()=>{
            codap.openTile('graph');
            cy.wait(2000)
        })
        it('verify num univariate plot transitions',()=>{
            cy.log(hash[0].attribute, hash[0].axis)
            cy.dragAttributeToTarget('table', hash[0].attribute, hash[0].axis)
            graph.clickRulerTool();
            graph.turnOnRulerTool('plottedMean')
            graph.getMeanLine().should('be.visible');
            graph.hoverMeanLine().then(()=>{
                graph.getGraphAdornmentText().should('exist').and('contain','mean=66')
            })
            cy.matchImageSnapshot('p_'+hash[0].attribute+'_on_'+hash[0].axis+'_adorned');
            cy.dragAttributeToTarget('table',hash[1].attribute, hash[1].axis)
            cy.wait(1000)
            graph.getMeanLine().should('be.visible').and('have.length',1);
            graph.getMeanLine().last().click()
            cy.get('.dg-graph-view svg path[stroke="#0000ff"]').last().trigger('mouseover').then(()=>{
                graph.getGraphAdornmentText().should('contain','mean=−0.24')
            })
            cy.matchImageSnapshot('p_'+hash[1].attribute+'_on_'+hash[1].axis+'_adorned');
            graph.clickRulerTool({force:true});
            graph.turnOffRulerTool('plottedMean')
            cy.matchImageSnapshot('p_'+hash[1].attribute+'_on_'+hash[1].axis+'_unadorned');
        })
        it('test num v num plot transitions',()=>{
            cy.dragAttributeToTarget('table', hash[1].attribute, hash[1].axis);
            cy.dragAttributeToTarget('table', hash[2].attribute, hash[2].axis);
            graph.clickRulerTool();
            graph.turnOnRulerTool('lsrl')
            graph.getLSLine().invoke('attr', 'stroke-opacity').should('include', '1');
            graph.getGraphEquationView().should('exist').and('contain','0.004')
            cy.matchImageSnapshot('p_'+hash[1].attribute+'_n_'+hash[2].attribute+'_adorned');
            cy.dragAttributeToTarget('table',hash[0].attribute, hash[0].axis)
            cy.wait(1000)
            graph.getLSLine().invoke('attr', 'stroke-opacity').should('include', '1');
            graph.getGraphEquationView().should('exist').and('contain','  +  10.5')
            cy.matchImageSnapshot('p_'+hash[0].attribute+'_n_'+hash[2].axis+'_adorned');
            graph.clickRulerTool({force:true});
            graph.turnOffRulerTool('lsrl')
            cy.wait(1000);
            cy.matchImageSnapshot('p_'+hash[0].attribute+'_n_'+hash[2].axis+'_unadorned');
            graph.getLSLine().invoke('attr', 'stroke-opacity').should('include', '0');
            graph.getGraphEquationView().should('have.class', 'sc-hidden')
        })
        it('test cat v num plot transitions',()=>{
            cy.dragAttributeToTarget('table', hash[3].attribute, hash[3].axis);
            cy.dragAttributeToTarget('table', hash[2].attribute, hash[2].axis);
            graph.clickRulerTool();
            graph.turnOnRulerTool('plottedMean')
            cy.wait(1000)
            graph.getMeanLine().should('be.visible').and('have.length', 7);
            graph.hoverMeanLine().then(()=>{
                graph.getGraphAdornmentText().should('exist').and('contain','mean=11.1')
            })
            cy.matchImageSnapshot('p_'+hash[3].attribute+'_n_'+hash[2].attribute+'_adorned');
            cy.dragAttributeToTarget('table',hash[4].attribute, hash[4].axis)
            cy.wait(1000)
            graph.getMeanLine().should('be.visible').and('have.length', 3);
            graph.hoverMeanLine().first().then(()=>{
                graph.getGraphAdornmentText().should('exist').and('contain','mean=12')
            })
            cy.matchImageSnapshot('p_'+hash[4].attribute+'_n_'+hash[2].axis+'_adorned');
            graph.clickRulerTool({force:true});
            graph.turnOffRulerTool('plottedMean')
            cy.matchImageSnapshot('p_'+hash[4].attribute+'_n_'+hash[2].axis+'_unadorned');
        })
        it('test cat v cat plot transitions',()=>{
            cy.dragAttributeToTarget('table', hash[5].attribute, hash[5].axis);
            cy.dragAttributeToTarget('table', hash[3].attribute, hash[3].axis);
            graph.clickRulerTool();
            graph.turnOnRulerTool('count')
            graph.getCountAdorn().should('have.length',28)
            cy.matchImageSnapshot('p_'+hash[5].attribute+'_n_'+hash[3].attribute+'_adorned');
            cy.dragAttributeToTarget('table',hash[4].attribute, hash[4].axis)
            cy.wait(1000)
            graph.getCountAdorn().should('have.length',12)
            cy.matchImageSnapshot('p_'+hash[5].attribute+'_n_'+hash[4].axis+'_adorned');
            graph.clickRulerTool({force:true});
            graph.turnOffRulerTool('count')
            cy.matchImageSnapshot('p_'+hash[5].attribute+'_n_'+hash[4].axis+'_unadorned');
        })
        it('test plot transition from num to cat',()=>{
            cy.dragAttributeToTarget('table', hash[1].attribute, hash[1].axis);
            graph.clickRulerTool();
            graph.turnOnRulerTool('plottedMean')
            graph.getMeanLine().should('be.visible');
            graph.hoverMeanLine().then(()=>{
                graph.getGraphAdornmentText().should('exist').and('contain','mean=−0.24')
            })
            cy.matchImageSnapshot('p_'+hash[2].attribute+'_on_'+hash[2].axis+'plot_adorned');
            cy.dragAttributeToTarget('table',hash[5].attribute, hash[1].axis)
            cy.wait(1000)
            graph.getMeanLine().should('not.exist');
        })
        it('test plot transition from cat to num',()=>{
            cy.dragAttributeToTarget('table', hash[5].attribute, hash[1].axis);
            graph.clickRulerTool();
            graph.turnOnRulerTool('count')
            graph.getCountAdorn().should('have.length',hash[5].length)
            cy.matchImageSnapshot('p_'+hash[2].attribute+'_on_'+hash[2].axis+'plot_adorned');
            cy.dragAttributeToTarget('table',hash[1].attribute, hash[1].axis)
            cy.wait(1000)
            graph.getCountAdorn().should('have.length',hash[1].length)
        })
        afterEach(()=>{
            codap.getGraphTileTitle().invoke('text').then((title) => {
                codap.closeTile('graph', title);
            });
        })
    })
})

