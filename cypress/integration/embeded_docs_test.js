const fs = require('fs-extra')
const path = require('path')

//need to rethink this one because it opens a new tab when it clicks on the listing
const links_file = "CODAPEmbedLinks.txt";
const CODAP_URL = "https://codap.concord.org/releases/staging/";
const queryParam = "?";
const max_attempts = 10;

var listingArray = []

context('Load all Sample documents in the CODAP sample doc page', ()=>{
    var attempt=0

    it('will load public page and take a screenshot', ()=>{
        //read in links_file and for each line, visit the site and take a screenshot
        listingArray = cy.readFile(links_file);
        listingArray.forEach((listing)=>{
            cy.visit(listing);
            cy.wait(5000);
            cy.matchImageSnapshot(title)

        })

    })

})
