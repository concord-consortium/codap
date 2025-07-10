const CODAPUrl = "https://codap.concord.org/releases/staging/"
const githubUrl = "https://concord-consortium.github.io/codap-data-interactives/";
const query = "?di="

before(()=>{
    cy.fixture("data_interactive_map.json").as("plugins")
})

context('Load all Sample documents in the CODAP sample doc page', ()=>{
    it('will load public page and take a screenshot', ()=>{
        //read in links_file and for each line, visit the site and take a screenshot
        cy.get('@plugins').then((pluginList)=>{
            let i=0;
            let url ='';
            let listing = pluginList.data_interactives;
            for (i;i<listing.length;i++){
                if ((listing[i].path).includes('http')) {
                    url = CODAPUrl+query+listing[i].path;
                } 
                else {
                    url = CODAPUrl+query+githubUrl+listing[i].path;
                }
                cy.visit(url);
                cy.wait(5000);
            cy.matchImageSnapshot(listing[i].title)
            }
        })
    })
})
