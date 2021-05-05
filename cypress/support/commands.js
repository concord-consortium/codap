// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import { addMatchImageSnapshotCommand } from 'cypress-image-snapshot/command'
import 'cypress-commands';

import TableTileObject from "./elements/TableTile";
import GraphTile from "./elements/GraphTile";
import MapTile from "./elements/MapTile";
import WebviewTile from "./elements/WebViewObject";

//This will open the example documents from the CFM menu

const tableTile = new TableTileObject;
const graphTile = new GraphTile;
const mapTile = new MapTile;
const webviewTile = new WebviewTile;

addMatchImageSnapshotCommand({ //need to fine tune threshholds
  failureThreshold: 0.05, // threshold for entire image
  failureThresholdType: 'percent', // percent of image or number of pixels
  customDiffConfig: { threshold: 0.5 }, // threshold for each pixel
  capture: 'viewport', // capture viewport in screenshot
  allowSizeMismatch: true
})

Cypress.Commands.add('clickMenuItem', text => {
  cy.log('in clickMenuItem. text: '+text)
  cy.get('a.menu-item span').contains(text)
    .trigger('mousemove')
    .trigger('mousedown',{which:1})
    .trigger('mouseup', {which:1});
});

Cypress.Commands.add('dragAttributeToTarget', (source, attribute, target,num=0)=>{
  const dt = new DataTransfer;
  const el={  tableHeader: '.slick-header-column .two-line-header-line-1',
              caseCardHeader: '.react-data-card-attribute',
              caseCardHeaderDropZone: '.react-data-card .data-cell-lower',
              caseCardCollectionDropZone: '.react-data-card .collection-header-row',
              graphTile: '.dg-graph-view',
              x_axis:'.dg-axis-view.dg-h-axis',
              x_axis_label: '.dg-axis-view.dg-h-axis .dg-axis-label',
              y_axis: '.dg-axis-view.dg-v-axis',
              y_axis_label: '.dg-axis-view.dg-v-axis .dg-axis-label',
              mapTile: '.dg.leaflet-container',
              newCollection: '.dg-table-drop-target'
            }

  var source_el='', target_el='';

  switch(source) {
    case ('table') :
        source_el=el.tableHeader;
        break
    case ('card') :
        source_el=el.caseCardHeader;
        break
    case ('x1') :
        source_el=el.x_axis;
        break
    case ('x') :
        source_el=el.x_axis_label;
        break
    case ('y1') :
        source_el=el.y_axis;
        break
    case ('y') :
        source_el=el.y_axis_label;
        break
  }

  switch(target) {
    case ('table') :
        target_el=el.tableHeader;
        break
    case ('card') :
        target_el=el.caseCardHeaderDropZone;
        break
    case ('card collection') :
        target_el=el.caseCardCollectionDropZone;
        break
    case ('graph_legend') :
        target_el=el.graphTile;
        break
    case ('map') :
        target_el=el.mapTile;
        break
    case ('x1') :
        target_el=el.x_axis;
        break
    case ('x') :
        target_el=el.x_axis_label;
        break
    case ('y1') :
        target_el=el.y_axis;
        break
    case ('y') :
        target_el=el.y_axis_label;
        break
    case('newCollection'):
        target_el=el.newCollection;
        break
  }
  cy.get(source_el).contains(attribute)
      .trigger('mousedown', {which:1},{dt})
      .trigger('dragstart', {dt})
  cy.get(target_el).eq(num).scrollIntoView()
      .trigger('mousemove',{force:true}, {which:1},{dt})
      .trigger('mousemove', {force:true},{which:1},{dt})
      .trigger('mouseup', {force:true}, {which:1}, {dt})
});

Cypress.Commands.add("resizeTile", (num) => {
  cy.get(".dg-component-resize-handle").eq(num)
    .trigger('mousedown', {force:true})
    .trigger('mousemove', 200,0, {force: true})
    .trigger('dragend', {force:true})
    .trigger('mouseup', {force:true});
});
// With current implementation of the cy.getPluginIframe and cy.getWebviewIframe custom command, only one iframe can be open
Cypress.Commands.add("getPluginIframe", (position = 0) => {
  getIframeBody(".dg-web-view-frame", position)
});

Cypress.Commands.add("getWebviewIframe", (position = 0) => {
  getIframeBody(".dg-web-view-frame", position);
});

Cypress.Commands.add("getSageIframe", () => {
  getIframeBody(".dg-web-view-frame")
});

const getIframeDocument = (selector, position) => {
  return cy.get(selector).eq(position).get("iframe")
  // Cypress yields jQuery element, which has the real
  // DOM element under property "0".
  // From the real DOM iframe element we can get
  // the "document" element, it is stored in "contentDocument" property
  // Cypress "its" command can access deep properties using dot notation
  // https://on.cypress.io/its
  .its(`${position}.contentDocument`).should('exist')
}

export const getIframeBody = (selector, position=0) => {
  // get the document
  return getIframeDocument(selector, position)
  // automatically retries until body is loaded
  .its('body').should('not.be.undefined')
  // wraps "body" DOM element to allow
  // chaining more Cypress commands, like ".find(...)"
  .then(cy.wrap)
}

Cypress.Commands.add("uploadFile",(selector, filename, type="")=>{
    return cy.get(selector).then((subject) => {
        return cy.fixture(filename)
            .then((blob) => {
            const el = subject[0]
            const testFile = new File([blob], filename, { type });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(testFile);
            el.files = dataTransfer.files;
            return subject;
        })
    })
})
Cypress.Commands.add("verifyComponentExists",(tiles)=>{
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
        webviewTile.getPlugin().should('be.visible').and('have.length', pluginNum)
    }
})

Cypress.Commands.overwrite('screenshot', (originalFn, subject, name, options) => {
  // only take screenshots in headless browser
  if (Cypress.browser.isHeadless) {
    // return the original screenshot function
    return originalFn(subject, name, options)
  }

  return cy.log('No screenshot taken when headed')
})
