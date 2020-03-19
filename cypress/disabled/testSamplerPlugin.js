import TableTile from '../support/elements/TableTile'
import GraphTile from '../support/elements/GraphTile'
import CodapObject from '../support/elements/CodapObject';
import MapTile from '../support/elements/MapTile';
import SliderTile from '../support/elements/SliderObject';
import TextTile from '../support/elements/TextObject';
import CalculatorTile from '../support/elements/CalculatorObject';
import SamplerPlugin from '../support/elements/SamplerPluginObject';
import DrawToolPlugin from '../support/elements/DrawToolObject';

const table = new TableTile;
const codap = new CodapObject;
const graph = new GraphTile;
const map = new MapTile;
const slider = new SliderTile
const textTile = new TextTile
const calculator = new CalculatorTile
const sampler = new SamplerPlugin
const drawTool = new DrawToolPlugin

const url = 'https://codap.concord.org/releases/staging/static/dg/en/cert/index.html'
// const url = 'http://localhost:4020/dg'

context('codap toolbar', ()=>{
    it('will open CODAP', ()=>{
        cy.visit(url)
        cy.get('button').contains("Create New Document").click();
    })
    it('will open Sampler', ()=>{
        codap.openTile('plugin','Sampler')
        cy.wait(60000);
        sampler.getSamplerPlugin().should('be.visible')
        //codap.closeTile('plugin','index'); //close the tile because it interferes with later tests
    })
})