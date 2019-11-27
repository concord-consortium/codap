// //need to rethink this one because it opens a new tab when it clicks on the listing
// const samplePluginURL = "https://concord-consortium.github.io/codap-data-interactives/";
// const CODAP_URL = "https://codap.concord.org/releases/staging/";
// const queryParam = "?di=";
// const max_attempts = 10;

// var listingArray = []


// context('Load all Sample documents in the CODAP sample doc page', ()=>{
//     var attempt=0

//     it('will load plugin in staging and take a screenshot', ()=>{
//         cy.visit(samplePluginURL);
//         // cy.get('#codap-url').type(CODAP_URL+{enter})
//         cy.get('.listing-link').each(($link,index,$links)=>{
//             cy.wrap($link)//get the href
//             // get the href for each of the sample documents and push it into listings array
//         })
//         listingArray.forEach((listing)=>{
//             var title = listing.slice('//')//Take the last slice of the string for the title
//             cy.visit(CODAP_URL+queryParm+listing)
//             cy.matchImageSnapshot(title) //maybe checking if plugin comes back 404 is enough so snapshot may not be needed.
//         })
//     })

// })
