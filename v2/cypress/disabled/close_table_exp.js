import TableTile from "../support/elements/TableTile";
import CodapObject from "../support/elements/CodapObject";
import CaseCardObject from "../support/elements/CaseCardObject";

const table = new TableTile;
const codap = new CodapObject;
const casecard = new CaseCardObject;

before(()=> {
    cy.viewport(1400,1000);
    cy.visit('https://codap.concord.org/releases/staging/?url=https://codap.concord.org/~eireland/3TableGroups.json')
    // cy.visit('http://localhost:4020/dg?url=http://codap-server.concord.org/~eireland/3TableGroups.json')
    cy.wait(5000)
    codap.getTableTileTitle().click() //bring the table into focus
}) 

describe('if your app uses jQuery', function(){
    ['mouseover', 'mouseout', 'mouseenter', 'mouseleave'].forEach((event) => {
      it(`triggers event: '${event}`, function(){
        // if your app uses jQuery, then we can trigger a jQuery
        // event that causes the event callback to fire
        //cy.get('#with-jquery').invoke('trigger', event)
        cy.get('.dg-titlebar').invoke('trigger',event)
        cy.get('.dg-close-icon').should('be.visible')
      })
    })
  })

  describe('if your app does not use jQuery', function(){
    ['mouseover', 'mouseout', 'mouseenter', 'mouseleave'].forEach((event) => {
      it(`dispatches event: '${event}`, function(){
        // if your app doesnt use jQuery then we use .trigger()
        // https://on.cypress.io/trigger

        //cy.get('#no-jquery').trigger(event)
        cy.get('.dg-titlebar').trigger(event)
        cy.get('.dg-close-icon').should('be.visible')
      })
    })
  })