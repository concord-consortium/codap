
context("case card", () => {
  beforeEach(() => {
    // cy.scrollTo() doesn't work as expected with `scroll-behavior: smooth`
    const queryParams = "?sample=mammals&scrollBehavior=auto"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2000)
  })

  describe("case card", () => {
    it("can switch from case table to case card view and back", () => {
      const tableHeaderLeftSelector = ".codap-component.codap-case-table .component-title-bar .header-left"
      cy.get(tableHeaderLeftSelector).click()
      cy.get(`${tableHeaderLeftSelector} .card-table-toggle-message`).click()
      cy.wait(500)
      const cardHeaderLeftSelector = ".codap-component.codap-case-card .component-title-bar .header-left"
      cy.get(cardHeaderLeftSelector).click()
      cy.get(`${cardHeaderLeftSelector} .card-table-toggle-message`).click()
    })
  })
})
