// //need to rethink this one because it opens a new tab when it clicks on the listing
// // const sampleDocURL = 'https://concord-consortium.github.io/codap-data/';
// // const CODAP_URL = "https://codap.concord.org/releases/staging/";
// // const queryParam = "?url=";
// // const max_attempts = 10;

// // var listingArray = []

// // context('Verify all sample documents in the CODAP sample doc page', ()=>{
// //     it('will load sample doc in staging and atake a screenshot', ()=>{
// //         cy.visit(sampleDocURL);
// //     })
// // })

// // context('Load all Sample documents in the CODAP sample doc page', ()=>{
// //     it('will load sample doc in staging and take a screenshot', ()=>{
// //         cy.visit(sampleDocURL)
// //         // cy.get('.listing-link').each(($link,index,$links)=>{
// //         //     cy.log($link)
// //         //     // var href = $link.prop('href');
// //         //     // listingArray.push(href);
// //         // })
// //         // listingArray.forEach((listing)=>{
// //         //     var title = listing.split('//');//Take the last slice of the string for the title
// //         //     cy.visit(CODAP_URL+queryParm+listing);
// //         //     cy.matchImageSnapshot(title[title.length-1]);
// //         // })
// //     })

// // })
// context('codap toolbar', ()=>{
//     it('will open a new table', ()=>{
//         cy.visit('http://localhost:4020/dg')
//         cy.get('button').contains("Create New Document").click();
//         cy.get('.dg-table-button')
//             .trigger('mousedown',{which:1})
//             .trigger('mouseup', {which:1});
//         cy.get('.sc-menu .sc-menu-item .menu-item span')
//             .trigger('mousemove')
//             .trigger('mousedown', {which:1})
//             .trigger('mouseup', {which:1});
//     })
// })
