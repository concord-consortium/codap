//for some reason wants to append codap link in front of links in the file so run the test from the separate codap-cypress-tests project
const baseUrl='https://concord.org/sites/default/files/codap/embed/'

before(()=>{
    cy.fixture("CODAPEmbedLinks.txt").as("exampleDocsData")
})

context('Load all Sample documents in the CODAP sample doc page', ()=>{
    it('will load public page and take a screenshot', ()=>{
        //read in links_file and for each line, visit the site and take a screenshot
        cy.get('@exampleDocsData').then((file)=>{
            let i=0;
            let listing=file.split(',')
            for (i;i<listing.length;i++){
                cy.log(baseUrl+listing[i])
                cy.visit(baseUrl+listing[i]);
                cy.wait(3000);
            cy.matchImageSnapshot((listing[i].split('.'))[0])
            }
        })
    })
})
