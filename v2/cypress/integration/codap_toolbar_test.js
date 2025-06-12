import TableTile from '../support/elements/TableTile'
import GraphTile from '../support/elements/GraphTile'
import CodapObject from '../support/elements/CodapObject';
import MapTile from '../support/elements/MapTile';
import SliderTile from '../support/elements/SliderObject';
import TextTile from '../support/elements/TextObject';
import CalculatorTile from '../support/elements/CalculatorObject';
import SamplerPlugin from '../support/plugin_elements/SamplerPluginObject';
import DrawToolPlugin from '../support/plugin_elements/DrawToolObject';

const table = new TableTile;
const codap = new CodapObject;
const graph = new GraphTile;
const map = new MapTile;
const slider = new SliderTile
const textTile = new TextTile
const calculator = new CalculatorTile
const sampler = new SamplerPlugin
const drawTool = new DrawToolPlugin

const baseUrl = `${Cypress.config("baseUrl")}`;

before(()=>{
    cy.visit(baseUrl)
})

context('codap toolbar', ()=>{
    it('will open CODAP', ()=>{
        cy.get('button').contains("Create New Document").click();
    })
    it('will open a new table', ()=>{
        codap.openTile('table','-- new --')
        table.getCaseTableTile().should('be.visible');
    })
    it('will open a graph', ()=>{
        codap.openTile('graph')
        graph.getGraphTile().should('be.visible')
    })
    it('will open a map', ()=>{
        codap.openTile('map')
        map.getMapTile().should('be.visible');
    })
    it('will open a slider', ()=>{
        // cy.wait(3000);
        codap.openTile('slider')
        slider.getSliderTile().should('be.visible');
    })
    it('will open a calculator', ()=>{
        codap.openTile('calc')
        calculator.getCalculatorTile().should('be.visible');
    })
    it('will open a text box', ()=>{
        codap.openTile('text')
        textTile.getTextTile().should('be.visible');
    })
    it('will open Sampler', ()=>{
        codap.openTile('plugin','Sampler')
        cy.wait(2000);
        sampler.getSamplerPlugin().should('be.visible')
        codap.closeTile('plugin','Sampler'); //close the tile because it interferes with later tests.
    })
    it('will open a Draw Tool', ()=>{
        codap.openTile('plugin','Draw Tool')
        cy.wait(2000);
        cy.getPluginIframe().find('#camera-flash').should('be.visible')
        codap.closeTile('plugin', 'DrawTool'); //close the tile because it interferes with later tests
    })
    it('will open WeatherX Plugin', ()=>{
        codap.openTile('plugin','NOAA Weather')
        cy.wait(2000);
        cy.getPluginIframe().find('#wx-get-button').should('be.visible')
        codap.closeTile('plugin', 'NOAA Weather'); //close the tile because it interferes with later tests
    })
    it('will focus table tile from Tile list', ()=>{
        codap.openTile('tilelist', 'New Dataset')
        cy.get('.dg-hier-table-view').siblings('.dg-titlebar-selected').should('exist')
    })
    it('will display a webpage', ()=>{
        var url='https://concord.org'
        codap.openTile('option', 'Display Web Page')
        codap.getSingleDialog().should('exist')
        codap.singleDialogEntry(url);
        //need to verify iframe with webpage
        // cy.wait(7000);
        cy.wait(5000);
        cy.getWebviewIframe().find('.concord-logo').should('be.visible')
        codap.closeTile('option', 'Web Page'); //close the tile because it interferes with later tests
    })
    it('will open Help tile', ()=>{
        var helpURL = "https://codap.concord.org/help"
        codap.openTile('help', 'Help Pages')
        cy.wait(5000);
        //verify iframe of helpURL is showing and has #page-title contains "CODAP Help"
        cy.getWebviewIframe().find('#page-title').should('contain', 'CODAP Help')
        codap.closeTile('help', 'Help with CODAP'); //close the tile because it interferes with later tests
    })
    // it('will open Help Forum Page', ()=>{
    //     //will have to investigate how to verify something opening in a new tab
    //     //Can't use the currently recommended way of
    //     //cy.get('a[href="/foo"]').should('have.attr', 'target', '_blank') // so simple
    //     //because menu item does not have an href
    // })
    // it('will open CODAP product Page', ()=>{
    //     //will have to investigate how to verify something opening in a new tab
    //     //Can't use the currently recommended way of
    //     //cy.get('a[href="/foo"]').should('have.attr', 'target', '_blank') // so simple
    //     //because menu item does not have an href
    // })
})