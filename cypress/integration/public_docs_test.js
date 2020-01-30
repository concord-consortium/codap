before(()=>{
    cy.fixture("CODAPDocLinks.txt").as("documents")
})

context('Load all Sample documents in the CODAP sample doc page', ()=>{
    it('will load public page and take a screenshot', ()=>{
        //read in links_file and for each line, visit the site and take a screenshot
        cy.get('@documents').then((file)=>{
            let i=0;
            let listing=file.split(',')
            for (i;i<listing.length;i++){
                cy.log(listing[i])
                cy.visit(listing[i]);
                cy.wait(5000);
            // cy.matchImageSnapshot(title)
            }
        })
    })
})
